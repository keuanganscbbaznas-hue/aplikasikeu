import { google } from "googleapis";

async function run() {
  try {
    const sheets = google.sheets({ version: "v4", auth: process.env.GOOGLE_API_KEY });
    // But wait, it might require auth even to just list sheets if not fully public.
    // However, if we just use an API key from GCP console... oh wait we don't have one here.
  } catch(e) {}
}
