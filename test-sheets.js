import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";

/** ESModule 환경에서 __dirname 만들기 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    console.log("🔍 GOOGLE_APPLICATION_CREDENTIALS =", process.env.GOOGLE_APPLICATION_CREDENTIALS);

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });

    const sheets = google.sheets({ version: "v4", auth });

    // 🔥 여기만 네 시트 ID로 변경해
    const SPREADSHEET_ID = "1AsEBaw6Pbrk1t3FxpSO2Nzx_6ltORHnPAbAfve8Xzd8";

    // 예시: 첫 시트 A1:D10 가져오기
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: "Items!A1:D10", // ← 시트명: Items 라고 가정
    });

    console.log("📘 Sheet data:");
    console.log(response.data.values);
    
  } catch (err) {
    console.error("❌ ERROR");
    console.error(err);
  }
}

main();
