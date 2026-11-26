import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { google } from "googleapis";
import { Readable } from "stream";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;

function resolveFirebaseProjectId(): string {
  try {
    const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(cfgPath)) {
      const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
      if (parsed?.projectId) return String(parsed.projectId);
    }
  } catch {
    // fallback below
  }
  return process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0768292926";
}

const FIREBASE_PROJECT_ID = resolveFirebaseProjectId();
let cachedGoogleCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }
  const resp = await fetch(
    "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
    { signal: AbortSignal.timeout(8000) }
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Firebase public certificates (${resp.status})`);
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cc = resp.headers.get("cache-control") || "";
  const maxAgeMatch = cc.match(/max-age=(\d+)/i);
  const maxAgeSec = maxAgeMatch ? Math.max(60, Number(maxAgeMatch[1])) : 3600;
  cachedGoogleCerts = { certs, expiresAt: now + maxAgeSec * 1000 };
  return certs;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; email?: string }> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Format token tidak valid");
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(Buffer.from(headerB64, "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("Algoritma atau key ID token tidak valid");
  }

  const certs = await getFirebasePublicCerts();
  const cert = certs[header.kid];
  if (!cert) {
    throw new Error("Sertifikat kunci token tidak ditemukan");
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureBuf = Buffer.from(signatureB64, "base64url");
  if (!verifier.verify(cert, signatureBuf)) {
    throw new Error("Signature token tidak valid");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.aud !== FIREBASE_PROJECT_ID) {
    throw new Error("Audience token tidak sesuai");
  }
  if (payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`) {
    throw new Error("Issuer token tidak sesuai");
  }
  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Subject token tidak valid");
  }
  if (typeof payload.exp !== "number" || payload.exp <= nowSec) {
    throw new Error("Token sesi telah kedaluwarsa");
  }
  if (typeof payload.iat !== "number" || payload.iat > nowSec + 300) {
    throw new Error("Waktu penerbitan token tidak valid");
  }

  return { uid: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
}

function normalizePhoneTarget(rawTarget: string): string {
  const tokens = rawTarget
    .split(",")
    .map((part) => part.replace(/\D/g, ""))
    .filter(Boolean)
    .map((digits) => (digits.startsWith("0") ? `62${digits.slice(1)}` : digits));

  const valid = tokens.filter((digits) => digits.length >= 8 && digits.length <= 16);
  return valid.join(",");
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // CORS handling: never emit wildcard Access-Control-Allow-Origin on authenticated /api/whatsapp/* routes
  app.use((req, res, next) => {
    const requestOrigin = req.headers.origin;
    if (req.path.startsWith("/api/whatsapp")) {
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const allowedExactOrigins = new Set([
        "https://aplikasikeu.vercel.app",
        ...(host ? [`https://${host}`, `http://${host}`] : []),
      ]);
      if (requestOrigin && allowedExactOrigins.has(requestOrigin)) {
        res.setHeader("Access-Control-Allow-Origin", requestOrigin);
        res.setHeader("Vary", "Origin");
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
      if (req.method === "OPTIONS") {
        return res.sendStatus(204);
      }
      return next();
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  const requireFirebaseAuth: express.RequestHandler = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ success: false, error: "Autentikasi diperlukan" });
    }
    try {
      const decoded = await verifyFirebaseIdToken(match[1].trim());
      (req as express.Request & { authUser?: { uid: string; email?: string } }).authUser = decoded;
      return next();
    } catch (err: any) {
      return res.status(401).json({ success: false, error: err?.message || "Token tidak valid" });
    }
  };

  // Background System Auth (Service Account)
  const getAuthClient = () => {
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("Missing Service Account Credentials");
    }
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: [
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
      ],
    });
  };

  app.get("/api/system/sync/status", (req, res) => {
    const hasCreds = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
    res.json({ ready: hasCreds, serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || null });
  });

  app.get("/api/whatsapp/status", requireFirebaseAuth, (req, res) => {
    const token = process.env.FONNTE_TOKEN?.trim() || process.env.WHATSAPP_GATEWAY_TOKEN?.trim();
    res.json({ configured: Boolean(token) });
  });

  app.post("/api/whatsapp/send", requireFirebaseAuth, async (req, res) => {
    try {
      const token = (process.env.FONNTE_TOKEN || process.env.WHATSAPP_GATEWAY_TOKEN || "").trim();
      if (!token) {
        return res.status(503).json({
          success: false,
          configured: false,
          error: "FONNTE_TOKEN belum dikonfigurasi di environment server (Settings -> Secrets).",
        });
      }

      const rawTarget = typeof req.body?.target === "string" ? req.body.target : "";
      const rawMessage = typeof req.body?.message === "string" ? req.body.message.trim() : "";

      const normalizedTarget = normalizePhoneTarget(rawTarget);
      if (!normalizedTarget) {
        return res.status(400).json({
          success: false,
          error: "Nomor WhatsApp tujuan tidak valid.",
        });
      }
      if (!rawMessage || rawMessage.length > 4000) {
        return res.status(400).json({
          success: false,
          error: "Pesan WhatsApp harus diisi dan maksimal 4000 karakter.",
        });
      }

      const formBody = new URLSearchParams({
        target: normalizedTarget,
        message: rawMessage,
        countryCode: "62",
      });

      const upstreamRes = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await upstreamRes.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {
        parsed = { raw: responseText };
      }

      if (!upstreamRes.ok || parsed?.status === false) {
        return res.status(502).json({
          success: false,
          configured: true,
          error: parsed?.reason || parsed?.detail || `Gateway WhatsApp mengembalikan status ${upstreamRes.status}`,
        });
      }

      return res.json({
        success: true,
        configured: true,
        detail: parsed?.detail || "Pesan WhatsApp terkirim",
      });
    } catch (error: any) {
      console.error("WhatsApp Push Error:", error?.message || error);
      return res.status(500).json({
        success: false,
        error: "Gagal menghubungi server gateway WhatsApp.",
      });
    }
  });

  app.post("/api/gemini/parse-donation", async (req, res) => {
    try {
      const { base64Data } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing image/document data" });
      }

      if (!process.env.GEMINI_API_KEY) {
        // Fallback or explicit warning
        return res.status(500).json({ error: "Kunci API Gemini (GEMINI_API_KEY) tidak terkonfigurasi di server." });
      }

      // Initialize GoogleGenAI as required for telemetry or server standard
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Extract raw base64 and mime type
      const match = base64Data.match(/^data:([^;]+);base64,(.*)$/);
      let mimeType = "image/png";
      let cleanBase64 = base64Data;
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      };

      const promptPart = {
        text: "Please analyze this Indonesian bank transfer or donation payment receipt. Extract the donation transfer amount (nominal) in Rupiah (IDR). Re-verify numbers carefully. Also extract any relevant transaction info into a short Indonesian note. Identify the destination account to determine if it is for SMP (1032913357) or SMA (1054796605). Find the sender's name if readable.",
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [imagePart, promptPart] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              success: {
                type: Type.BOOLEAN,
                description: "True if a valid bank statement/proof/receipt was parsed successfully."
              },
              amount: {
                type: Type.NUMBER,
                description: "The total transfer amount numeric value (in IDR). Exclude fee if possible. Example: 150000. If not found or failed, return 0."
              },
              notes: {
                type: Type.STRING,
                description: "A short Indonesian transaction note detailing the bank name, date, or sender if readable."
              },
              targetAccount: {
                type: Type.STRING,
                description: "Detect destination account. If the destination account number has '1032913357' or mentions 'SMP', return 'smp'. If the destination account number has '1054796605' or mentions 'SMA', return 'sma'. Otherwise return ''."
              },
              senderName: {
                type: Type.STRING,
                description: "The sender/donor name (pengirim) if clearly visible on the receipt. Otherwise return ''."
              }
            },
            required: ["success", "amount", "notes", "targetAccount", "senderName"]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("No response output text received from Gemini API");
      }

      const parsed = JSON.parse(responseText.trim());
      res.json(parsed);
    } catch (error: any) {
      console.error("Error parsing donation receipt with Gemini:", error);
      res.status(500).json({ error: error.message || "Gagal memproses bukti transfer otomatis" });
    }
  });

  let scbLogoCache: Buffer | null = null;
  let baznasLogoCache: Buffer | null = null;

  app.get("/api/logo/scb", async (req, res) => {
    try {
      if (scbLogoCache) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(scbLogoCache);
      }
      const response = await fetch("https://neoschool.oss-ap-southeast-5.aliyuncs.com/scb/core/organizations/scb-logo-1710220971.png", {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        scbLogoCache = Buffer.from(arrayBuffer);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(scbLogoCache);
      } else {
        throw new Error(`SCB Logo remote fetch failed with status ${response.status}`);
      }
    } catch (e: any) {
      console.error("Error proxying SCB Logo:", e);
      res.status(500).send("Error fetching SCB Logo: " + e.message);
    }
  });

  app.get("/api/logo/baznas", async (req, res) => {
    try {
      if (baznasLogoCache) {
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(baznasLogoCache);
      }
      const response = await fetch("https://baznas.go.id/assets/images/logo_baznas_mobile.png", {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        baznasLogoCache = Buffer.from(arrayBuffer);
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return res.send(baznasLogoCache);
      } else {
        throw new Error(`BAZNAS Logo remote fetch failed with status ${response.status}`);
      }
    } catch (e: any) {
      console.error("Error proxying BAZNAS Logo:", e);
      res.status(500).send("Error fetching BAZNAS Logo: " + e.message);
    }
  });

  app.post("/api/drive/upload", async (req, res) => {
    try {
      const auth = getAuthClient();
      const drive = google.drive({ version: "v3", auth });
      const { filename, base64Data, mimeType } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: "Missing file data" });
      }

      // Convert Base64 to Buffer safely
      let base64Part = base64Data;
      if (base64Data.includes(',')) {
        base64Part = base64Data.split(',')[1];
      }
      const buffer = Buffer.from(base64Part, 'base64');
      const stream = Readable.from(buffer);

      const fileMetadata: any = {
        name: filename || 'donation_proof.png',
      };

      // Use target folder if provided in env and valid
      if (process.env.GOOGLE_DRIVE_FOLDER_ID && 
          process.env.GOOGLE_DRIVE_FOLDER_ID !== "undefined" && 
          process.env.GOOGLE_DRIVE_FOLDER_ID !== "null" && 
          process.env.GOOGLE_DRIVE_FOLDER_ID.trim() !== "") {
        fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID.trim()];
      }

      const media = {
        mimeType: mimeType || 'image/png',
        body: stream,
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      const fileId = file.data.id;

      // Only add permissions if not in a shared drive (where permissions might be inherited or restricted)
      try {
        await drive.permissions.create({
          fileId: fileId!,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      } catch (permErr: any) {
        console.warn("Permission sync warning:", permErr.message);
      }

      res.json({ 
        success: true, 
        fileId: file.data.id,
        link: file.data.webContentLink || file.data.webViewLink 
      });
    } catch (error: any) {
      console.error("Drive Upload Error:", error.message || error);
      
      const errMsg = error.message || "";
      const isQuota = errMsg.toLowerCase().includes("storage quota") || errMsg.toLowerCase().includes("quota exceeded");
      
      // Return a 200 with success: false so the frontend can handle it as a non-fatal sync error
      return res.status(200).json({ 
        success: false, 
        error: isQuota ? "Drive Quota Error" : "Drive Sync Error",
        message: isQuota 
          ? "Service Account tidak memiliki kuota storage. Silakan bagikan folder Google Drive ke email service account sebagai Editor."
          : `Gagal mengunggah file ke Google Drive (${errMsg || "Bad Request"}). Pastikan folder tujuan di-share dengan hak Editor ke email Service Account.`,
        serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
      });
    }
  });

  app.post("/api/sheets/append", async (req, res) => {
    try {
      const auth = getAuthClient();
      const sheets = google.sheets({ version: "v4", auth });
      const { spreadsheetId, range, data } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Data must be a non-empty array of rows" });
      }

      let hasPlaceholder = false;
      let placeholderColIndex = -1;

      // Scan rows to find and replace __ROW_FORMULA__ with empty string, preserving position
      for (let r = 0; r < data.length; r++) {
        if (Array.isArray(data[r])) {
          for (let c = 0; c < data[r].length; c++) {
            if (data[r][c] === "__ROW_FORMULA__") {
              hasPlaceholder = true;
              placeholderColIndex = c;
              data[r][c] = ""; // Set block empty for initial append
            }
          }
        }
      }

      const appendResponse = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: range || 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data
        }
      });

      // If we found a placeholder and got an updated range, overwrite with the relative formula
      if (hasPlaceholder && appendResponse.data.updates?.updatedRange) {
        const updatedRange = appendResponse.data.updates.updatedRange; // e.g., "'Kas Tunai SMP'!A314:I314"
        const regex = /(?:'([^']+)'|([^!]+))!([A-Z]+)(\d+):([A-Z]+)(\d+)/;
        const match = updatedRange.match(regex);

        if (match) {
          const sheetName = match[1] || match[2];
          const startRow = parseInt(match[4], 10);
          const endRow = parseInt(match[6], 10);
          const colLetter = String.fromCharCode(65 + placeholderColIndex); // e.g. 8 -> 'I'

          for (let row = startRow; row <= endRow; row++) {
            const prevRow = row - 1;
            // Native Excel/Sheets relative formula: Balance = PrevBalance (I) + Debet (G) - Kredit (H)
            const formula = `=${colLetter}${prevRow}+G${row}-H${row}`;
            const cellRange = `'${sheetName}'!${colLetter}${row}`;

            await sheets.spreadsheets.values.update({
              spreadsheetId,
              range: cellRange,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [[formula]]
              }
            });
          }
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Sheets Append Error:", error.message);
      if (error.code === 403 || error.message.includes('permission')) {
        return res.status(403).json({ 
          error: "Sheets Append Error: The caller does not have permission",
          message: `Service Account (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}) tidak memiliki akses ke Spreadsheet ini. Silakan bagikan Spreadsheet tersebut ke email Service Account sebagai 'Editor'.`,
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        });
      }
      res.status(500).json({ error: error.message || "Gagal menambah data ke Google Sheets" });
    }
  });

  app.post("/api/sheets/sync", async (req, res) => {
    try {
      const auth = getAuthClient();
      const sheets = google.sheets({ version: "v4", auth });
      const { spreadsheetId, data, sheetName } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ error: "Missing spreadsheetId" });
      }

      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ error: "Data must be a non-empty array of rows" });
      }

      // Check spreadsheet info to identify sheet tabs
      const spreadsheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
      const sheetsList = spreadsheetInfo.data.sheets || [];

      let targetSheetTitle = sheetName || "Tracking Transaksi";
      const sheetExists = sheetsList.some(s => s.properties?.title === targetSheetTitle);

      if (!sheetExists && sheetsList.length > 0) {
        // Attempt to create sheet tab with title
        try {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  addSheet: {
                    properties: {
                      title: targetSheetTitle,
                    },
                  },
                },
              ],
            },
          });
        } catch (addErr) {
          // Fallback to first existing tab if creation is restricted
          targetSheetTitle = sheetsList[0].properties?.title || "Sheet1";
        }
      }

      // Clear the target sheet range first
      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `'${targetSheetTitle}'!A:Z`,
        });
      } catch (clearErr) {
        // Fallback without single quotes if needed
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: 'A:Z',
        });
      }

      // Write new data
      const updateResponse = await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${targetSheetTitle}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });

      res.json({ 
        success: true, 
        updatedRows: data.length - 1, 
        sheetTitle: targetSheetTitle,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
        updates: updateResponse.data 
      });
    } catch (error: any) {
      console.error("Sheets Sync Error:", error.message);
      if (error.code === 403 || (error.message && error.message.includes('permission'))) {
        return res.status(403).json({ 
          error: "Sheets Sync Error: The caller does not have permission",
          message: `Service Account (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || 'Service Account'}) tidak memiliki akses ke Spreadsheet ini. Silakan bagikan Spreadsheet tersebut ke email Service Account sebagai 'Editor'.`,
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        });
      }
      res.status(500).json({ error: error.message || "Gagal menyinkronkan data ke Google Sheets" });
    }
  });

  app.get("/api/sheets/proxy_csv", async (req, res) => {
    try {
      const { spreadsheetId, gid } = req.query;
      if (!spreadsheetId) {
        return res.status(400).send("Missing spreadsheetId");
      }
      const timestamp = Date.now();
      const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid || '0'}&_t=${timestamp}`;
      const response = await fetch(targetUrl, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Google Sheets responded with ${response.status}`);
      }
      const csvStr = await response.text();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.send(csvStr);
    } catch (error: any) {
      console.error("Sheets Proxy Error:", error.message);
      res.status(500).send("Error fetching spreadsheet");
    }
  });

  app.get("/api/sheets/fetch_csv", async (req, res) => {
    try {
      const rawUrl = String(req.query.url || "").trim();
      if (!rawUrl) {
        return res.status(400).json({ error: "URL Google Sheets wajib diisi." });
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(rawUrl);
      } catch {
        return res.status(400).json({ error: "Format URL Google Sheets tidak valid." });
      }

      if (
        parsedUrl.protocol !== "https:" ||
        (parsedUrl.hostname !== "docs.google.com" && !parsedUrl.hostname.endsWith(".googleusercontent.com"))
      ) {
        return res.status(400).json({ error: "URL harus berasal dari Google Sheets (https://docs.google.com/spreadsheets/...)." });
      }

      const timestamp = Date.now();
      const gidMatch = rawUrl.match(/[?#&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : null;
      const isPublished2Pacx = rawUrl.includes("/spreadsheets/d/e/");
      const stdIdMatch = !isPublished2Pacx ? rawUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) : null;
      const spreadsheetId = stdIdMatch ? stdIdMatch[1] : null;

      const candidateUrls: string[] = [];

      if (isPublished2Pacx) {
        // Published to web link (2PACX-...)
        let pubCsv = rawUrl.split("#")[0];
        if (pubCsv.includes("/pubhtml")) {
          pubCsv = pubCsv.replace("/pubhtml", "/pub");
        }
        const u = new URL(pubCsv);
        u.searchParams.set("output", "csv");
        if (gid && !u.searchParams.has("gid")) {
          u.searchParams.set("gid", gid);
        }
        if (gid && !u.searchParams.has("single")) {
          u.searchParams.set("single", "true");
        }
        u.searchParams.set("_t", String(timestamp));
        candidateUrls.push(u.toString());
      } else if (spreadsheetId) {
        if (rawUrl.includes("output=csv") || rawUrl.includes("format=csv") || rawUrl.includes("tqx=out:csv")) {
          const sep = rawUrl.includes("?") ? "&" : "?";
          candidateUrls.push(`${rawUrl.split("#")[0]}${sep}_t=${timestamp}`);
        }
        const gidQuery = gid ? `&gid=${gid}` : "";
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv${gidQuery}&_t=${timestamp}`);
        candidateUrls.push(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv${gidQuery}&_t=${timestamp}`);
      } else {
        const sep = rawUrl.includes("?") ? "&" : "?";
        candidateUrls.push(`${rawUrl}${sep}_t=${timestamp}`);
      }

      const isHtmlResponse = (text: string, contentType: string | null) => {
        const trimmed = text.trim().slice(0, 200).toLowerCase();
        return (
          (contentType && contentType.toLowerCase().includes("text/html")) ||
          trimmed.startsWith("<!doctype html") ||
          trimmed.startsWith("<html")
        );
      };

      for (const target of candidateUrls) {
        try {
          const response = await fetch(target, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "User-Agent": "Mozilla/5.0"
            },
            redirect: "follow"
          });
          if (response.ok) {
            const text = await response.text();
            const ct = response.headers.get("content-type");
            if (text.trim() && !isHtmlResponse(text, ct)) {
              return res.json({ success: true, csv: text, source: "public_csv" });
            }
          }
        } catch {
          // Try next candidate
        }
      }

      // Fallback: Try authenticated Google Sheets API v4 via Service Account if standard spreadsheetId
      if (spreadsheetId && process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
        try {
          const auth = getAuthClient();
          const sheets = google.sheets({ version: "v4", auth });
          const meta = await sheets.spreadsheets.get({ spreadsheetId });
          const sheetsList = meta.data.sheets || [];
          let targetSheet = sheetsList[0];
          if (gid) {
            const found = sheetsList.find(s => String(s.properties?.sheetId) === gid);
            if (found) targetSheet = found;
          }
          const title = targetSheet?.properties?.title || "Sheet1";
          const valuesRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${title}'!A:Z`
          });
          const rows = valuesRes.data.values || [];
          const escapeCsvCell = (val: any) => {
            const s = val === null || val === undefined ? "" : String(val);
            if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
              return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
          };
          const csvText = rows.map(row => row.map(escapeCsvCell).join(",")).join("\n");
          return res.json({ success: true, csv: csvText, source: "service_account", sheetTitle: title });
        } catch (apiErr: any) {
          console.error("Sheets API Fallback Error:", apiErr.message);
        }
      }

      return res.status(403).json({
        error: "Tidak dapat membaca data dari Google Sheets tersebut. Pastikan akses link disetel ke 'Siapa saja yang memiliki link dapat melihat' atau sudah 'Publikasikan ke web (.csv)'."
      });
    } catch (error: any) {
      console.error("Sheets fetch_csv error:", error.message);
      res.status(500).json({ error: error.message || "Gagal mengambil data Google Sheets." });
    }
  });

  // Support local uploads for reliable gallery image storage without CORS/Storage blocks
  app.post("/api/gallery/upload", async (req, res) => {
    try {
      const { filename, base64Data, mimeType } = req.body;
      if (!base64Data) {
        return res.status(400).json({ error: "Missing base64Data" });
      }

      const fs = await import("fs");
      const path = await import("path");

      const uploadDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Convert Base64 data to Buffer
      const base64Clean = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Clean, "base64");
      
      const safeFilename = `${Date.now()}_${(filename || "upload.png").replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
      const filePath = path.join(uploadDir, safeFilename);

      fs.writeFileSync(filePath, buffer);

      res.json({
        success: true,
        url: `/uploads/${safeFilename}`
      });
    } catch (error: any) {
      console.error("Local upload error:", error);
      res.status(500).json({ error: error.message || "Failed to save file locally" });
    }
  });

  // Serve the local uploads directory
  app.get("/uploads/:filename", async (req, res) => {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "uploads", req.params.filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("File not found");
    }
  });

  // Vite setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
