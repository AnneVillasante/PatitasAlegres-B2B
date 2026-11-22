$ErrorActionPreference = "Continue"
Write-Host "===== PUERTOS DE SERVICIOS =====" -ForegroundColor Cyan
$ports = @(@('Registro',8080),@('Auth',5000),@('Propietarios',8003),@('Mascotas',8081),@('Personal',8005),@('Ventas',3000),@('Citas',8007),@('Farmacia',8008),@('Notificaciones',8010),@('SOAP Adapter',8099),@('WSO2 MI',8290))
foreach($item in $ports){
  $ok=Test-NetConnection 127.0.0.1 -Port $item[1] -InformationLevel Quiet -WarningAction SilentlyContinue
  Write-Host ("{0,-18} {1,-5} {2}" -f $item[0],$item[1],$(if($ok){'DISPONIBLE'}else{'CERRADO'})) -ForegroundColor $(if($ok){'Green'}else{'Red'})
}
Write-Host "`n===== AUTH MYSQL =====" -ForegroundColor Cyan
try { Invoke-RestMethod http://127.0.0.1:5000/test-db -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Write-Host "`n===== PERSONAL ESPECIALIDADES =====" -ForegroundColor Cyan
try { (Invoke-WebRequest http://127.0.0.1:8005/veterinarios/especialidades -Method POST -ContentType 'text/xml' -Body '' -UseBasicParsing -TimeoutSec 5).Content } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Write-Host "`n===== NODE MYSQL =====" -ForegroundColor Cyan
try { Invoke-RestMethod http://127.0.0.1:3000/api/salud -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Write-Host "`n===== ADAPTADOR SOAP =====" -ForegroundColor Cyan
try { Invoke-RestMethod http://127.0.0.1:8099/health -TimeoutSec 5 | ConvertTo-Json -Depth 5 } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
Write-Host "`n===== WSO2 LIST SERVICES =====" -ForegroundColor Cyan
try { (Invoke-WebRequest http://127.0.0.1:8290/services/listServices -UseBasicParsing -TimeoutSec 10).StatusCode } catch { Write-Host $_.Exception.Message -ForegroundColor Red }
