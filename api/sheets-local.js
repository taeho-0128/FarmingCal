import 'dotenv/config';
import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// 공통 구글 API 로더
async function loadFromSheet(range) {
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_KEY),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  const sheetId = process.env.SHEET_ID;
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return res.data.values;
}

// 시트 범위 매핑
const ranges = {
  items: "Items!A2:B999",
  monsters: "Monsters!A2:E999",
  maps: "Maps!A2:D999",
  mapMonster: "MapMonster!A2:D999",
  drops: "ItemMonsterDrop!A2:D999"
};

// 단일 API: /sheets?type=items
app.get("/sheets", async (req, res) => {
  const { type } = req.query;

  if (!ranges[type]) {
    return res.json({ ok: false, error: "Unknown sheet type" });
  }

  try {
    const data = await loadFromSheet(ranges[type]);
    return res.json({ ok: true, data });
  } catch (err) {
    console.error(err);
    return res.json({ ok: false, error: err.message });
  }
});

// 포트 4000
app.listen(4000, () => {
  console.log("Local Sheets API running at http://localhost:4000");
});
