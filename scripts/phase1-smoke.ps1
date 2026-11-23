$ErrorActionPreference = 'Stop'

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "SMOKE TEST INTEGRAL - 9 MICROSERVICIOS (FASE 1)" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Cyan

$services = @(
    @{ Name = '01-registro'; Port = 8080; Url = 'http://127.0.0.1:8080/api/registro/estado'; Method = 'GET'; Body = $null; Type = 'JSON' },
    @{ Name = '02-auth'; Port = 5000; Url = 'http://127.0.0.1:5000/test-db'; Method = 'GET'; Body = $null; Type = 'JSON' },
    @{ Name = '03-propietarios'; Port = 8003; Url = 'http://127.0.0.1:8003/propietarios/listar'; Method = 'POST'; Body = '<listarPropietariosRequest/>'; Type = 'XML' },
    @{ Name = '04-mascotas'; Port = 8081; Url = 'http://127.0.0.1:8081/api/mascotas/estado'; Method = 'GET'; Body = $null; Type = 'TEXT' },
    @{ Name = '05-personal'; Port = 8005; Url = 'http://127.0.0.1:8005/veterinarios/especialidades'; Method = 'POST'; Body = '<listarEspecialidadesRequest/>'; Type = 'XML' },
    @{ Name = '06-venta-node'; Port = 3000; Url = 'http://127.0.0.1:3000/api/salud'; Method = 'GET'; Body = $null; Type = 'JSON' },
    @{ Name = '07-citas'; Port = 8007; Url = 'http://127.0.0.1:8007/citas/listar'; Method = 'POST'; Body = '<listarCitasRequest><id_propietario>1</id_propietario></listarCitasRequest>'; Type = 'XML' },
    @{ Name = '08-farmacia'; Port = 8008; Url = 'http://127.0.0.1:8008/farmacia/productos'; Method = 'GET'; Body = $null; Type = 'XML' },
    @{ Name = '10-notificaciones'; Port = 8010; Url = 'http://127.0.0.1:8010/notificaciones/consultar/NOT-NO-EXISTE'; Method = 'GET'; Body = $null; Type = 'XML' }
)
$passed = 0
$failed = 0

foreach ($service in $services) {
    $portOpen = Test-NetConnection 127.0.0.1 -Port $service.Port -InformationLevel Quiet
    if (-not $portOpen) {
        Write-Warning "$($service.Name.PadRight(18)): puerto $($service.Port) no disponible"
        $failed++
        continue
    }

    try {
        if ($service.Method -eq 'GET') {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $service.Url -Method Get
        } else {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $service.Url -Method Post -ContentType 'text/xml' -Body $service.Body
        }

        if ($service.Type -eq 'XML' -and $response.Content -notmatch '<\?xml|<[^>]+Response|<error') {
            throw 'La respuesta no parece XML'
        }

        Write-Host "$($service.Name.PadRight(18)): OK (HTTP $($response.StatusCode) - $($service.Type))" -ForegroundColor Green
        $passed++
    } catch {
        $resp = $_.Exception.Response
        if ($resp -and [int]$resp.StatusCode -eq 404 -and $service.Name -eq '10-notificaciones') {
            Write-Host "$($service.Name.PadRight(18)): OK (HTTP 404 - Controlado XML)" -ForegroundColor Green
            $passed++
            continue
        }
        $status = if ($resp) { [int]$resp.StatusCode } else { 'sin respuesta' }
        Write-Warning "$($service.Name.PadRight(18)): fallo HTTP ($status) - $($_.Exception.Message)"
        $failed++
    }
}

Write-Host "`n===== ADAPTADOR SOAP =====" -ForegroundColor Cyan
try {
    $adapter = Invoke-RestMethod 'http://127.0.0.1:8099/health' -TimeoutSec 5
    Write-Host "11-soap-adapter     : OK (HTTP 200 - $($adapter.status))" -ForegroundColor Green
    $passed++
} catch {
    Write-Warning "11-soap-adapter     : no disponible"
    $failed++
}

Write-Host "`n===== PROVEEDORES EXTERNOS =====" -ForegroundColor Cyan
foreach ($provider in @(@('PseudoRENIEC','http://127.0.0.1:9001/health'),@('PseudoSUNAT','http://127.0.0.1:9002/health'))) {
    try {
        $health = Invoke-RestMethod $provider[1] -TimeoutSec 5
        Write-Host "$($provider[0].PadRight(18)): OK (HTTP 200 - $($health.status), $($health.registros) registros)" -ForegroundColor Green
        $passed++
    } catch {
        Write-Warning "$($provider[0].PadRight(18)): no disponible"
        $failed++
    }
}

Write-Host "`n===== WSO2 MI - 11 PROXIES =====" -ForegroundColor Cyan
$proxies = @(
    'AuthProxy','RegistroProxy','PropietariosProxy','MascotasProxy','VeterinariosProxy',
    'VentaProxy','CitasProxy','FarmaciaProxy','NotificacionesProxy','ReniecProxy','SunatProxy'
)
foreach ($proxy in $proxies) {
    try {
        $response = Invoke-WebRequest "http://127.0.0.1:8290/services/$proxy`?wsdl" -UseBasicParsing -TimeoutSec 10
        Write-Host "$($proxy.PadRight(22)): OK (HTTP $($response.StatusCode) - WSDL)" -ForegroundColor Green
        $passed++
    } catch {
        $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'sin respuesta' }
        Write-Warning "$($proxy.PadRight(22)): fallo (HTTP $status)"
        $failed++
    }
}

Write-Host "`nResultado: $passed correctos, $failed fallos." -ForegroundColor $(if ($failed -eq 0) { 'Green' } else { 'Yellow' })
