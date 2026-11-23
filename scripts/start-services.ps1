param([switch]$SkipDocker, [switch]$SkipJava)
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $PSScriptRoot
function PortOpen([int]$p) { return [bool](Test-NetConnection 127.0.0.1 -Port $p -InformationLevel Quiet -WarningAction SilentlyContinue) }
$containers = @(docker ps --format '{{.Names}}' 2>$null)
if (-not $SkipDocker) {
  $missing = @('clinica-mysql','clinica-activemq') | Where-Object { $_ -notin $containers }
  if ($missing.Count -gt 0) { Write-Host "Faltan contenedores: $($missing -join ', '). Se intentará levantar solo mysql/activemq." -ForegroundColor Yellow; Push-Location $root; docker compose up -d mysql activemq; Pop-Location }
  else { Write-Host "MySQL y ActiveMQ ya están activos; no se reinician." -ForegroundColor Green }
}
function Start-One($name,$folder,$port,$command) {
  if (PortOpen $port) { Write-Host "${name}: puerto $port ya está ocupado; se omite sin detener el proceso." -ForegroundColor Yellow; return }
  $path=Join-Path $root "services\$folder"
  $line="Set-Location '$path'; $command"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($line))
  Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-EncodedCommand',$encoded) -WindowStyle Normal | Out-Null
  Start-Sleep -Seconds 3
  if (PortOpen $port) { Write-Host "$name iniciado (puerto $port)." -ForegroundColor Green } else { Write-Host "$name lanzado; verifica la ventana si aún no abre el puerto $port." -ForegroundColor Yellow }
}
Start-One '02-auth' '02-auth' 5000 'if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe app.py } else { py app.py }'
Start-One '03-propietarios' '03-propietarios' 8003 'php -S 0.0.0.0:8003 -t public'
Start-One '05-personal' '05-personal' 8005 'if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe app.py } else { py app.py }'
Start-One '06-venta-node' '06-venta-node' 3000 'npm start'
Start-One '07-citas' '07-citas' 8007 'php -S 0.0.0.0:8007 -t public'
Start-One '10-notificaciones' '10-notificaciones' 8010 'php -S 0.0.0.0:8010 -t public'
$listenerRunning = Get-CimInstance Win32_Process -Filter "Name = 'php.exe'" | Where-Object { $_.CommandLine -like '*listener.php*' }
if ($listenerRunning) {
  Write-Host "Listener STOMP de Notificaciones ya está activo; se omite." -ForegroundColor Yellow
} else {
  $listenerPath = Join-Path $root "services\10-notificaciones"
  $listenerCommand = "Set-Location '$listenerPath'; php bin/listener.php"
  $listenerEncoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($listenerCommand))
  Start-Process powershell.exe -ArgumentList @('-NoExit','-ExecutionPolicy','Bypass','-EncodedCommand',$listenerEncoded) -WindowStyle Normal | Out-Null
  Write-Host "Listener STOMP de Notificaciones lanzado en una ventana independiente." -ForegroundColor Green
}
Start-One '11-soap-adapter' '11-soap-adapter' 8099 'if (Test-Path .\.venv\Scripts\python.exe) { .\.venv\Scripts\python.exe app.py } else { py app.py }'
Start-One '12-PseudoRENIEC' '..\external\PseudoReniec' 9001 'if (-not (Test-Path .\node_modules)) { npm install }; npm start'
Start-One '13-PseudoSUNAT' '..\external\PseudoSunat' 9002 'if (-not (Test-Path .\node_modules)) { npm install }; npm start'
if (-not $SkipJava) {
  Write-Host "Los tres servicios Java se inician al final por consumo de memoria." -ForegroundColor Cyan
  Start-One '01-registro' '01-registro' 8080 '$env:MAVEN_OPTS="-Xms128m -Xmx512m"; .\mvnw.cmd spring-boot:run'
  Start-One '04-mascotas' '04-mascotas' 8081 '$env:MAVEN_OPTS="-Xms128m -Xmx512m"; .\mvnw.cmd spring-boot:run'
  Start-One '08-farmacia' '08-farmacia' 8008 '$env:MAVEN_OPTS="-Xms128m -Xmx512m"; .\mvnw.cmd spring-boot:run'
}
if (PortOpen 8290) {
  Write-Host "WSO2 MI ya está disponible en el puerto 8290; no se inicia ni se reinicia." -ForegroundColor Green
} else {
  Write-Host "WSO2 MI no está disponible en el puerto 8290. Inicia o verifica el contenedor clinica-wso2mi por separado." -ForegroundColor Yellow
}
Write-Host "Inicio solicitado. Ningún proceso existente fue terminado." -ForegroundColor Green


