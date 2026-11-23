$ErrorActionPreference = "Continue"
Write-Host "===== PUERTOS DE SERVICIOS =====" -ForegroundColor Cyan
$ports = @(
    @('Registro',8080),@('Auth',5000),@('Propietarios',8003),
    @('Mascotas',8081),@('Personal',8005),@('Ventas',3000),
    @('Citas',8007),@('Farmacia',8008),@('Notificaciones',8010),
    @('SOAP Adapter',8099),@('PseudoRENIEC',9001),@('PseudoSUNAT',9002),@('WSO2 MI',8290),
    @('MySQL',3307),@('ActiveMQ STOMP',61613),@('ActiveMQ Consola',8161)
)
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
Write-Host "`n===== PROVEEDORES EXTERNOS =====" -ForegroundColor Cyan
foreach ($provider in @(@('PseudoRENIEC','http://127.0.0.1:9001/health'),@('PseudoSUNAT','http://127.0.0.1:9002/health'))) {
    try {
        $health = Invoke-RestMethod $provider[1] -TimeoutSec 5
        Write-Host ("{0,-18} HTTP 200 - {1}" -f $provider[0],$health.status) -ForegroundColor Green
    } catch {
        Write-Host ("{0,-18} NO DISPONIBLE" -f $provider[0]) -ForegroundColor Red
    }
}
Write-Host "`n===== WSO2 LIST SERVICES =====" -ForegroundColor Cyan
$proxies = @(
    'AuthProxy','RegistroProxy','PropietariosProxy','MascotasProxy',
    'VentaProxy','CitasProxy','FarmaciaProxy','NotificacionesProxy','ReniecProxy','SunatProxy',
    'VeterinariosProxy'
)
foreach ($proxy in $proxies) {
    try {
        $response = Invoke-WebRequest "http://127.0.0.1:8290/services/$proxy`?wsdl" -UseBasicParsing -TimeoutSec 10
        Write-Host ("{0,-22} HTTP {1}" -f $proxy,$response.StatusCode) -ForegroundColor Green
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'sin respuesta' }
        Write-Host ("{0,-22} HTTP {1}" -f $proxy,$status) -ForegroundColor Red
    }
}
