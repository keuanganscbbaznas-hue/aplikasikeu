export default async function handler(req, res) {
  try {
    const { spreadsheetId, gid } = req.query;
    if (!spreadsheetId) {
      return res.status(400).send("Missing spreadsheetId");
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    const targetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid || '0'}`;
    const response = await fetch(targetUrl);
    if (!response.ok) {
      throw new Error(`Google Sheets responded with ${response.status}`);
    }
    const csvStr = await response.text();
    res.setHeader('Content-Type', 'text/csv');
    res.send(csvStr);
  } catch (error) {
    console.error("Sheets Proxy Error:", error.message);
    res.status(500).send("Error fetching spreadsheet");
  }
}
