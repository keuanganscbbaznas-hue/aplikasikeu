import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import { google } from "googleapis";

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
