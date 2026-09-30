@echo off
rem Switches apps\api\.env to the Hostinger settings and builds the upload package.
rem Run set-local-env.bat afterwards to develop locally again.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "apps\api\.env.hostinger" (
  echo apps\api\.env.hostinger bulunamadı. Hostinger ayarlarını bu dosyaya yazın.
  exit /b 1
)

copy /y "apps\api\.env.hostinger" "apps\api\.env" >nul || goto :error
echo apps\api\.env Hostinger ayarlarına geçirildi.
node scripts\show-env.mjs
netstat -ano | findstr /R /C:":3001 .*LISTENING" >nul && (
  echo.
  echo UYARI: API su an calisiyor ve eski .env ayarlariyla devam eder.
  echo npm run dev penceresini kapatip yeniden baslatin.
)

call npm run package:hostinger || goto :error

echo.
echo Yükleme paketi hazır: deploy\fitness-app-hostinger.zip
echo Ortam değişkenlerini Hostinger panelinde tanımlamayı unutmayın.
echo Yerelde tekrar çalışmak için: set-local-env.bat
exit /b 0

:error
echo.
echo Hostinger paketi hazırlanamadı. Yukarıdaki hatayı kontrol edin.
exit /b 1
