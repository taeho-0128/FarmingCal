import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";

export default async function handler(req, res) {
  try {
    const auth = new GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SHEET_ID;
    const range = "Items!A1:B10";

    const result = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    res.status(200).json({
      ok: true,
      data: result.data.values,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
