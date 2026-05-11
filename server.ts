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

      const fileMetadata = {
        name: filename || 'donation_proof.png',
        // Optional: you could specify a folder ID here if you want to organize uploads
      };

      const media = {
        mimeType: mimeType || 'image/png',
        body: stream,
      };

      const file = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink',
      });

      const fileId = file.data.id;

      // Make file readable by anyone with the link
      await drive.permissions.create({
        fileId: fileId!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      res.json({ 
        success: true, 
        fileId: file.data.id,
        link: file.data.webViewLink 
      });
    } catch (error: any) {
      console.error("Drive Upload Error:", error.message);
      // Return a 200 with success: false so the frontend can handle it as a non-fatal sync error
      if (error.message.includes("storage quota")) {
        return res.status(200).json({ 
          success: false, 
          error: "Service Account Quota Exceeded. Please share a folder with the service account email.",
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

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: range || 'A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data
        }
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Sheets Append Error:", error.message);
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
