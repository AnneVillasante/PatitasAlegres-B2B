[CmdletBinding()]
param()
$ports = @(8080,5000,8003,8081,8005,3000,8007,8008,8010,8099,9001,9002)
Write-Host "Se van a revisar procesos que escuchan en puertos del proyecto." -ForegroundColor Yellow
Write-Host "Este script NO detiene MySQL, ActiveMQ ni WSO2." -ForegroundColor Yellow
$found = @()
foreach($port in $ports){
  $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach($c in $connections){
    $proc = Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue
    if($proc){ $found += [PSCustomObject]@{Port=$port;PID=$proc.Id;Process=$proc.ProcessName} }
  }
}
# El listener STOMP no abre uno de los puertos HTTP del proyecto.
Get-CimInstance Win32_Process -Filter "Name = 'php.exe'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -like '*listener.php*' } |
  ForEach-Object {
    $found += [PSCustomObject]@{Port='STOMP';PID=$_.ProcessId;Process='php (listener.php)'}
  }
$found = $found | Sort-Object PID -Unique
if(-not $found){ Write-Host "No hay procesos escuchando en puertos de microservicios." -ForegroundColor Green; exit 0 }
$found | Format-Table -AutoSize
$confirm = Read-Host "Para detener estos procesos escribe DETENER; cualquier otra respuesta cancela"
if($confirm -cne 'DETENER'){ Write-Host "Cancelado. No se detuvo ningún proceso." -ForegroundColor Green; exit 0 }
foreach($item in $found){ Stop-Process -Id $item.PID -ErrorAction Continue; Write-Host "Solicitud de cierre enviada al PID $($item.PID) ($($item.Process))." }
