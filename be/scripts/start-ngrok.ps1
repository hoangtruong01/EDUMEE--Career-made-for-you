$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $repoRoot 'ngrok.yml'
$exampleConfigPath = Join-Path $repoRoot 'ngrok.example.yml'

$ngrok = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrok) {
  Write-Error "ngrok was not found in PATH. Install ngrok first, then run 'npm run ngrok:start'."
}

if (-not (Test-Path $configPath)) {
  Write-Error "Missing ngrok.yml. Copy ngrok.example.yml to ngrok.yml, set your authtoken, then rerun this script."
}

$config = Get-Content $configPath -Raw
if ($config -match 'YOUR_NGROK_AUTHTOKEN') {
  Write-Error "ngrok.yml still contains the placeholder authtoken. Replace it with your real ngrok token first."
}

Write-Host "Starting ngrok tunnel for backend http://localhost:3000 ..."
Write-Host "SePay IPN URL will be: https://<your-ngrok-domain>/api/v1/payments/sepay/ipn"
& $ngrok.Source start backend --config $configPath
