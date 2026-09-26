@echo off
rem Switches apps\api\.env to the Hostinger settings and builds the upload package.
rem Run env-local.bat afterwards to develop locally again.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "apps\api\.env.hostinger" (
  echo apps\api\.env.hostinger bulunamadı. Hostinger ayarlarını bu dosyaya yazın.
  exit /b 1
)

copy /y "apps\api\.env.hostinger" "apps\api\.env" >nul || goto :error
echo apps\api\.env Hostinger ayarlarına geçirildi.

call npm run package:hostinger || goto :error

echo.
echo Yükleme paketi hazır: deploy\fitness-app-hostinger.zip
echo Ortam değişkenlerini Hostinger panelinde tanımlamayı unutmayın.
echo Yerelde tekrar çalışmak için: env-local.bat
exit /b 0

:error
echo.
echo Hostinger paketi hazırlanamadı. Yukarıdaki hatayı kontrol edin.
exit /b 1
