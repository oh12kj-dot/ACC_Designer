@echo off
chcp 65001 >nul
setlocal
pushd "%~dp0"
if errorlevel 1 goto failed
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 以降をインストールしてください。
  goto failed
)
node scripts\desktop-launcher.mjs
if errorlevel 1 goto failed
popd
exit /b 0
:failed
echo.
echo 起動または終了に失敗しました。表示された内容を確認してください。
pause
popd
exit /b 1
