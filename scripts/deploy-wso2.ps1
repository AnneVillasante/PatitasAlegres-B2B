param([string]$Container = "clinica-wso2mi")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$running = docker inspect -f '{{.State.Running}}' $Container 2>$null
if ($running -ne 'true') { throw "El contenedor $Container no está en ejecución. No se iniciará ni reiniciará automáticamente." }
$home = "/home/wso2carbon/wso2mi-4.7.0"
$proxyTarget = "$home/repository/deployment/server/synapse-configs/default/proxy-services"
$registry = "$home/registry/config"
docker exec $Container sh -lc "mkdir -p '$proxyTarget' '$registry/wsdl' '$registry/xsd'"
# Backup existing same-name proxies before replacing.
$backup = Join-Path $root "esb\backup-wso2"
New-Item -ItemType Directory -Force -Path $backup | Out-Null
Get-ChildItem (Join-Path $root "esb\proxy-services") -Filter "*Proxy.xml" | ForEach-Object {
    $remote = "$proxyTarget/$($_.Name)"
    docker cp "${Container}:$remote" (Join-Path $backup $_.Name) 2>$null
    docker cp $_.FullName "${Container}:$remote"
}
# Copy WSDLs and their adjacent XSDs into the MI configuration registry.
Get-ChildItem (Join-Path $root "esb\wso2-registry\wsdl") -File | ForEach-Object {
    docker cp $_.FullName "${Container}:$registry/wsdl/$($_.Name)"
}
Get-ChildItem (Join-Path $root "esb\wso2-registry\xsd") -File | ForEach-Object {
    docker cp $_.FullName "${Container}:$registry/xsd/$($_.Name)"
}
Write-Host "Artefactos copiados. WSO2 detectará los proxies por hot deployment; no se reinició el contenedor." -ForegroundColor Green
Write-Host "Comprueba: http://localhost:8290/services/listServices" -ForegroundColor Cyan
