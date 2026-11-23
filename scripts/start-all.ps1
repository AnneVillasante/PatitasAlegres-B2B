[CmdletBinding()]
param(
    [switch]$SkipDocker,
    [switch]$SkipJava,
    [switch]$SkipExternal,
    [switch]$SkipWso2,
    [switch]$SkipSeed,
    [switch]$SkipSmoke
)
$ErrorActionPreference = "Continue"

Write-Host "===== INICIO RAPIDO PATITAS ALEGRE =====" -ForegroundColor Cyan
& "$PSScriptRoot\start-services.ps1" -SkipDocker:$SkipDocker -SkipJava:$SkipJava -SkipExternal:$SkipExternal

if (-not $SkipWso2) {
    $wso2Running = Test-NetConnection 127.0.0.1 -Port 8290 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($wso2Running) {
        Write-Host "Desplegando proxies WSO2..." -ForegroundColor Cyan
        & "$PSScriptRoot\deploy-wso2.ps1"
    } else {
        Write-Host "WSO2 MI no está disponible en 8290; omitiendo despliegue automático." -ForegroundColor Yellow
    }

    if (-not $SkipSeed) {
        $mysqlReady = Test-NetConnection 127.0.0.1 -Port 3307 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($mysqlReady) {
            Write-Host "Poblando cuentas y datos de demostración..." -ForegroundColor Cyan
            & "$PSScriptRoot\seed-demo.ps1"
        } else {
            Write-Host "MySQL no está disponible en 3307; omitiendo siembra demo." -ForegroundColor Yellow
        }
    }
}

if (-not $SkipSmoke) {
    Start-Sleep -Seconds 3
    & "$PSScriptRoot\test-soa.ps1"
}
