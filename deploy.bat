@echo off
cd C:\Users\user\huntcalc

:: Git 초기화 (최초 1회)
if not exist .git (
    git init
)

:: 브랜치/원격 설정 (이미 있으면 조용히 재설정)
git branch -M main
git remote remove origin >nul 2>nul
git remote add origin https://github.com/taeho-0128/FarmingCal.git

:: 변경사항 커밋 & 푸시
git add .
git commit -m "deploy: update"
git push -u origin main

echo.
echo ✅ GitHub 푸시 완료! (repo: taeho-0128/FarmingCal, branch: main)
echo 👉 Vercel 대시보드에서 자동 빌드 상태를 확인하세요.
pause