@echo off
chcp 65001 >nul
setlocal
pushd "%~dp0"
if errorlevel 1 goto failed
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 以降と Google Chrome をインストールしてください。
  goto failed
)
node scripts\setup-desktop.mjs
if errorlevel 1 goto failed
echo.
pause
popd
exit /b 0
:failed
echo.
echo セットアップに失敗しました。表示された内容を確認してください。
pause
popd
exit /b 1
