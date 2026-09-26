# Manages a portable MariaDB server for local development. It needs no
# administrator rights: binaries and data live under %LOCALAPPDATA%\SercanFitness,
# outside the repository, and the server only listens on 127.0.0.1.
#
# Usage: powershell -ExecutionPolicy Bypass -File scripts\local-db.ps1 <setup|start|stop|status>
param(
  [ValidateSet('setup', 'start', 'stop', 'status')]
  [string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$Version = '11.4.13'
$ZipSha256 = 'd62986d433eeebfde218560b276103831604a61e929e87f1a17f5aebd80257e2'
$Port = 3306
$DatabaseName = 'fitness_app'
$DatabaseUser = 'fitness'

$Root = Join-Path $env:LOCALAPPDATA 'SercanFitness'
$BaseDir = Join-Path $Root "mariadb-$Version-winx64"
$DataDir = Join-Path $Root 'mariadb-data'
$RootPasswordFile = Join-Path $Root 'root-password.txt'
$Bin = Join-Path $BaseDir 'bin'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$ApiDir = Join-Path $RepoRoot 'apps\api'
$EnvLocal = Join-Path $ApiDir '.env.local'

function New-Secret([int]$Bytes) {
  $buffer = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
  return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Test-ServerRunning {
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $client.Connect('127.0.0.1', $Port)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Install-Binaries {
  if (Test-Path (Join-Path $Bin 'mariadbd.exe')) { return }

  New-Item -ItemType Directory -Force -Path $Root | Out-Null
  $zip = Join-Path $Root "mariadb-$Version-winx64.zip"
  Write-Host "MariaDB $Version indiriliyor (yaklaşık 100 MB)..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  Invoke-WebRequest -UseBasicParsing -OutFile $zip `
    -Uri "https://downloads.mariadb.org/rest-api/mariadb/$Version/mariadb-$Version-winx64.zip"

  $hash = (Get-FileHash -Algorithm SHA256 $zip).Hash.ToLowerInvariant()
  if ($hash -ne $ZipSha256) {
    Remove-Item $zip -Force
    throw 'İndirilen MariaDB arşivinin SHA-256 özeti eşleşmedi.'
  }

  Write-Host 'Arşiv açılıyor...'
  Expand-Archive -Path $zip -DestinationPath $Root -Force
  Remove-Item $zip -Force
}

function Start-Server {
  if (Test-ServerRunning) {
    Write-Host "Yerel veritabanı zaten çalışıyor (127.0.0.1:$Port)."
    return
  }
  if (-not (Test-Path $DataDir)) {
    throw 'Yerel veritabanı kurulmamış. Önce "setup" çalıştırın.'
  }

  Start-Process -FilePath (Join-Path $Bin 'mariadbd.exe') -WindowStyle Hidden -ArgumentList @(
    "--defaults-file=`"$(Join-Path $DataDir 'my.ini')`"",
    '--bind-address=127.0.0.1'
  )

  for ($i = 0; $i -lt 40; $i++) {
    if (Test-ServerRunning) {
      Write-Host "Yerel veritabanı başlatıldı (127.0.0.1:$Port)."
      return
    }
    Start-Sleep -Milliseconds 500
  }
  throw "Yerel veritabanı 20 saniye içinde başlamadı. Günlük: $DataDir"
}

function Stop-Server {
  if (-not (Test-ServerRunning)) {
    Write-Host 'Yerel veritabanı zaten kapalı.'
    return
  }
  $rootPassword = (Get-Content $RootPasswordFile -Raw).Trim()
  & (Join-Path $Bin 'mariadb-admin.exe') --host=127.0.0.1 --port=$Port --user=root "--password=$rootPassword" shutdown
  Write-Host 'Yerel veritabanı durduruldu.'
}

function Initialize-Database {
  if (Test-Path $DataDir) {
    Write-Host 'Veri klasörü zaten var, kurulum atlandı.'
    return
  }

  $rootPassword = New-Secret 18
  & (Join-Path $Bin 'mariadb-install-db.exe') "--datadir=$DataDir" "--port=$Port" "--password=$rootPassword"
  if ($LASTEXITCODE -ne 0) { throw 'mariadb-install-db başarısız oldu.' }
  Set-Content -Path $RootPasswordFile -Value $rootPassword -Encoding ascii

  Start-Server

  $appPassword = New-Secret 18
  # prisma migrate dev creates a temporary shadow database, so the local
  # development user needs global privileges. The server only accepts local
  # connections.
  $sql = @"
CREATE DATABASE IF NOT EXISTS $DatabaseName CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DatabaseUser'@'localhost' IDENTIFIED BY '$appPassword';
CREATE USER IF NOT EXISTS '$DatabaseUser'@'127.0.0.1' IDENTIFIED BY '$appPassword';
GRANT ALL PRIVILEGES ON *.* TO '$DatabaseUser'@'localhost';
GRANT ALL PRIVILEGES ON *.* TO '$DatabaseUser'@'127.0.0.1';
FLUSH PRIVILEGES;
"@
  $sql | & (Join-Path $Bin 'mariadb.exe') --host=127.0.0.1 --port=$Port --user=root "--password=$rootPassword"
  if ($LASTEXITCODE -ne 0) { throw 'Veritabanı ve kullanıcı oluşturulamadı.' }

  if (-not (Test-Path $EnvLocal)) {
    $example = Get-Content (Join-Path $ApiDir '.env.example')
    $values = @{
      'DATABASE_URL'      = "mysql://${DatabaseUser}:$appPassword@127.0.0.1:$Port/$DatabaseName"
      'JWT_ACCESS_SECRET' = (New-Secret 48)
    }
    $lines = foreach ($line in $example) {
      $key = ($line -split '=', 2)[0]
      if ($values.ContainsKey($key)) { "$key=$($values[$key])" } else { $line }
    }
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllLines($EnvLocal, [string[]]$lines, $utf8)
    Write-Host "apps\api\.env.local oluşturuldu."
  }
}

switch ($Action) {
  'setup' {
    Install-Binaries
    Initialize-Database
    Start-Server
  }
  'start' { Start-Server }
  'stop' { Stop-Server }
  'status' {
    if (Test-ServerRunning) { Write-Host "Çalışıyor (127.0.0.1:$Port)" } else { Write-Host 'Kapalı' }
  }
}
