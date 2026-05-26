@echo off
echo =========================================
echo CC Chat UI Sandbox
echo =========================================
echo.
if not exist package.json (
  echo ERROR: Hay chay file nay trong thu muc cc-chat-ui-sandbox.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Dang cai dependencies...
  npm install
)

echo.
echo Dang mo dev server...
echo Trinh duyet: http://localhost:5173
echo.
npm run dev
pause
