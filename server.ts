import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { google } from "googleapis";
import { Readable } from "stream";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // Support Cross-Origin Requests (CORS) for external environments (e.g., Vercel deployment)
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

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

  app.post("/api/drive/upload", async (req, res) => {
    try {
      const auth = getAuthClient();
      const drive = google.drive({ version: "v3", auth });
      const { filename, base64Data, mimeType } = req.body;

      if (!base64Data) {
        return res.status(400).json({ error: "Missing file data" });
      }

      // Convert Base64 to Buffer
      const buffer = Buffer.from(base64Data.split(',')[1], 'base64');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      const fileMetadata: any = {
        name: filename || 'donation_proof.png',
      };

      // Use target folder if provided in env
      if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
        fileMetadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
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
      console.error("Drive Upload Error:", error.message);
      
      // Return a 200 with success: false so the frontend can handle it as a non-fatal sync error
      if (error.message.toLowerCase().includes("storage quota") || error.message.toLowerCase().includes("quota exceeded")) {
        return res.status(200).json({ 
          success: false, 
          error: "Drive Quota Error",
          message: "Service Account tidak memiliki kuota storage. Silakan bagikan folder Google Drive ke email service account sebagai Editor.",
          serviceAccount: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
        });
      }
      res.status(500).json({ error: error.message || "Gagal mengunggah file ke Google Drive" });
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
      const { spreadsheetId, data } = req.body;

      // Clear the sheet first
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'A:Z',
      });

      // Write new data
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Sheets Sync Error:", error.message);
      if (error.code === 403 || error.message.includes('permission')) {
        return res.status(403).json({ 
          error: "Sheets Sync Error: The caller does not have permission",
          message: `Service Account (${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}) tidak memiliki akses ke Spreadsheet ini. Silakan bagikan Spreadsheet tersebut ke email Service Account sebagai 'Editor'.`,
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
      const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid || '0'}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Google Sheets responded with ${response.status}`);
      }
      const csvStr = await response.text();
      res.setHeader('Content-Type', 'text/csv');
      res.send(csvStr);
    } catch (error: any) {
      console.error("Sheets Proxy Error:", error.message);
      res.status(500).send("Error fetching spreadsheet");
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
