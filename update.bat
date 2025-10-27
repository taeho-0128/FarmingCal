@echo off
cd C:\Users\user\huntcalc

echo 🔍 변경사항을 확인 중...
git status

echo.
echo 🧩 변경사항 커밋 중...
git add .
git commit -m "update: 최신 코드 반영"

echo.
echo 🚀 GitHub로 푸시 중...
git push

echo.
echo ✅ 업데이트 완료! Vercel에서 자동으로 새 배포가 시작됩니다.
echo 👉 https://vercel.com/dashboard 에서 빌드 로그를 확인하세요.

pause