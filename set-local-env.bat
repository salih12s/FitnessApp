@echo off
rem Switches the API to the local MariaDB database and makes sure it is running.
rem The first run downloads and sets up the portable database automatically.
chcp 65001 >nul
setlocal
cd /d "%~dp0"

if not exist "apps\api\.env.local" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\local-db.ps1" setup || goto :error
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\local-db.ps1" start || goto :error
)

copy /y "apps\api\.env.local" "apps\api\.env" >nul || goto :error
echo apps\api\.env yerel ayarlara geçirildi.
node scripts\show-env.mjs
netstat -ano | findstr /R /C:":3001 .*LISTENING" >nul && (
  echo.
  echo UYARI: API su an calisiyor ve eski .env ayarlariyla devam eder.
  echo npm run dev penceresini kapatip yeniden baslatin.
)

call npm run prisma:migrate:deploy || goto :error
call npm run prisma:seed || goto :error

echo.
echo Yerel ortam hazır. Uygulamayı başlatmak için: npm run dev
echo Web: http://localhost:3005   API: http://localhost:3001/api
exit /b 0

:error
echo.
echo Yerel ortama geçilemedi. Yukarıdaki hatayı kontrol edin.
exit /b 1
