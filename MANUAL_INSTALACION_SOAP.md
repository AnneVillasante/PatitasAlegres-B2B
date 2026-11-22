# MANUAL DE INSTALACIÓN Y PRUEBAS — PATITAS ALEGRES SOA

> Preparado para Windows 10/11, PowerShell, Docker Desktop, Java 25, Maven, Python 3.14, Node.js 24, PHP 8.5, Composer y WSO2 Micro Integrator 4.7.0. Los comandos asumen que estás en la carpeta raíz que contiene `docker-compose.yml`.

## 0. Qué incluye esta versión

- Nueve microservicios originales: Registro (8080), Auth (5000), Propietarios (8003), Mascotas (8081), Personal/Veterinarios (8005), Ventas (3000), Citas (8007), Farmacia (8008) y Notificaciones (8010).
- WSO2 Micro Integrator con proxies SOAP y WSDL para los nueve servicios.
- Adaptador de traducción SOAP a los contratos HTTP/XML o HTTP/JSON existentes (puerto 8099).
- Simulaciones locales RENIEC y SUNAT. No se consulta ningún sistema oficial.
- ActiveMQ y MySQL por Docker Compose.

## 1. Requisitos

Instala/valida: Docker Desktop con Linux containers, Java 25, Maven 3.9+, Python 3.14, Node 24+, npm, PHP 8.5 con `pdo_mysql`, `curl`, `SimpleXML`, `openssl`, Composer 2+, y WSO2 MI 4.7.0.

Comprueba en PowerShell:

```powershell
docker --version
docker compose version
java --version
mvn --version
py --version
node --version
npm --version
php --version
composer --version
```

## 2. Preparar variables de entorno

No se distribuyen archivos `.env` con contraseñas. Copia cada ejemplo y completa los valores con los usuarios y contraseñas de `database/DB_users.sql` y tu instalación local. No publiques esos archivos.

```powershell
$servicios = @('01-registro','02-auth','03-propietarios','04-mascotas','05-personal','06-venta-node','07-citas','08-farmacia','10-notificaciones')
foreach ($s in $servicios) {
  $ejemplo = ".\services\$s\.env.example"
  $destino = ".\services\$s\.env"
  if ((Test-Path $ejemplo) -and -not (Test-Path $destino)) { Copy-Item $ejemplo $destino }
}
```

Revisa especialmente:
- Todos los servicios Windows: `DB_HOST=127.0.0.1`, `DB_PORT=3307`.
- Auth: `DB_PASSWORD` y un `JWT_SECRET` largo y aleatorio; `APP_HOST=0.0.0.0`, `NO_BROWSER=1`.
- Personal, Propietarios y Citas: `DB_PASS`.
- Node: `DB_PASSWORD`.
- Notificaciones: `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`; ActiveMQ STOMP `tcp://127.0.0.1:61613`.
- Farmacia: `DB_PASSWORD`, ActiveMQ OpenWire `tcp://127.0.0.1:61616`.
- Java services importan su `.env` local con Spring Config Data.

Los nombres de variables son distintos por servicio; no renombres `DB_PASS` a `DB_PASSWORD` donde el código espera `DB_PASS`.

## 3. Preparar dependencias

```powershell
# Auth
Set-Location .\services\02-auth
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Personal
Set-Location ..\05-personal
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Adaptador SOAP
Set-Location ..\11-soap-adapter
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

# Node
Set-Location ..\06-venta-node
npm ci

# PHP: repetir en cada carpeta PHP
Set-Location ..\03-propietarios
composer install --no-interaction
Set-Location ..\07-citas
composer install --no-interaction
Set-Location ..\10-notificaciones
composer install --no-interaction

# Java: compilar sin arrancar
Set-Location ..\01-registro
.\mvnw.cmd -DskipTests package
Set-Location ..\04-mascotas
.\mvnw.cmd -DskipTests package
Set-Location ..\08-farmacia
.\mvnw.cmd -DskipTests package
Set-Location ..\..
```

## 4. MySQL y ActiveMQ

Primero verifica si los contenedores ya existen. Si están activos, no los recrees.

```powershell
docker ps --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}"
```

Si no existen, desde la raíz:

```powershell
docker compose up -d mysql activemq
```

Puertos host: MySQL 3307, ActiveMQ consola 8161, OpenWire 61616, STOMP 61613. La primera inicialización de MySQL ejecuta scripts de `database/` solo si el volumen está vacío. No borres volúmenes para reimportar datos.

## 5. Arrancar WSO2 MI

El contenedor esperado se llama `clinica-wso2mi`, WSO2 4.7.0, HTTP 8290 y HTTPS 8253. Comprueba:

```powershell
docker ps --filter "name=clinica-wso2mi"
Test-NetConnection localhost -Port 8290
```

No ejecutes `docker compose down`, `docker volume prune` ni elimines contenedores. El script `scripts/stop-services.ps1` pide confirmación explícita y no detiene MySQL, ActiveMQ ni WSO2.

## 6. Arrancar microservicios y adaptador

Una vez creados y configurados los `.env`, desde la raíz:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-services.ps1 -SkipDocker
```

El script no mata procesos existentes: si un puerto está ocupado, omite ese servicio. Inicia Java al final y limita Maven a 512 MB por proceso. Si tu PC se queda sin memoria, usa `-SkipJava` y arranca cada Java service manualmente cuando lo necesites.

Para iniciar manualmente Java (una ventana por servicio):

```powershell
Set-Location .\services\01-registro; $env:MAVEN_OPTS='-Xms128m -Xmx512m'; .\mvnw.cmd spring-boot:run
Set-Location .\services\04-mascotas; $env:MAVEN_OPTS='-Xms128m -Xmx512m'; .\mvnw.cmd spring-boot:run
Set-Location .\services\08-farmacia; $env:MAVEN_OPTS='-Xms128m -Xmx512m'; .\mvnw.cmd spring-boot:run
```

## 7. Desplegar proxies y WSDL en WSO2

Con los backends y el adaptador activos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-wso2.ps1
```

El script hace backup de proxies existentes con el mismo nombre, copia los 11 proxies (nueve servicios + RENIEC + SUNAT) y recursos WSDL/XSD al registro `conf:/wsdl`. No reinicia WSO2. Comprueba:

```powershell
Invoke-WebRequest http://localhost:8290/services/listServices -UseBasicParsing
```

WSDL esperados:

```text
http://localhost:8290/services/AuthProxy?wsdl
http://localhost:8290/services/RegistroProxy?wsdl
http://localhost:8290/services/PropietariosProxy?wsdl
http://localhost:8290/services/MascotasProxy?wsdl
http://localhost:8290/services/VeterinariosProxy?wsdl
http://localhost:8290/services/VentaProxy?wsdl
http://localhost:8290/services/CitasProxy?wsdl
http://localhost:8290/services/FarmaciaProxy?wsdl
http://localhost:8290/services/NotificacionesProxy?wsdl
http://localhost:8290/services/ReniecProxy?wsdl
http://localhost:8290/services/SunatProxy?wsdl
```

## 8. Probar SOAP

Prueba SOAP 1.1 de consulta de especialidades desde PowerShell:

```powershell
$soap = Get-Content .\esb\soap-ejemplos\listar-especialidades.xml -Raw
Invoke-WebRequest -Uri http://localhost:8290/services/VeterinariosProxy -Method POST -ContentType 'text/xml; charset=utf-8' -Headers @{ SOAPAction='urn:listarEspecialidades' } -Body $soap -UseBasicParsing
```

Prueba SOAP de productos:

```powershell
$soap = Get-Content .\esb\soap-ejemplos\listar-productos.xml -Raw
Invoke-WebRequest -Uri http://localhost:8290/services/VentaProxy -Method POST -ContentType 'text/xml; charset=utf-8' -Headers @{ SOAPAction='urn:listarProductos' } -Body $soap -UseBasicParsing
```

RENIEC y SUNAT son demostraciones locales. Prueba los ejemplos incluidos:

```powershell
$soap = Get-Content .\esb\soap-ejemplos\consultar-reniec-demo.xml -Raw
Invoke-WebRequest -Uri http://localhost:8290/services/ReniecProxy -Method POST -ContentType 'text/xml; charset=utf-8' -Headers @{ SOAPAction='urn:consultarDni' } -Body $soap -UseBasicParsing
$soap = Get-Content .\esb\soap-ejemplos\consultar-sunat-demo.xml -Raw
Invoke-WebRequest -Uri http://localhost:8290/services/SunatProxy -Method POST -ContentType 'text/xml; charset=utf-8' -Headers @{ SOAPAction='urn:consultarRuc' } -Body $soap -UseBasicParsing
```

Registros demo: DNI `12345678`, RUC `20123456789`. Son datos ficticios.

## 9. Verificación general

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test-soa.ps1
```

El código HTTP 200/201 confirma respuesta satisfactoria; 400/401/404 puede indicar que la ruta está activa pero el contenido o registro no existe. HTTP 502 indica que el adaptador no puede alcanzar un backend. HTTP 000 indica problema de conectividad.

## 10. Notas de integración y límites conocidos

- WSO2 es la puerta de entrada SOAP. El adaptador `11-soap-adapter` traduce los mensajes SOAP a los formatos reales de cada API; no sustituye las reglas de negocio de los microservicios.
- Los servicios XML (Propietarios, Personal, Citas, Farmacia y Notificaciones) reciben XML. Auth, Registro, Mascotas y Ventas reciben JSON y se transforman en el adaptador.
- El servicio Java de Registro expone alta de cliente, no consulta por usuario. El contrato se limita a esa operación.
- Ventas expone listar productos, crear venta, listar ventas y consultar venta; no se inventa confirmación/cancelación de venta porque el backend actual no las implementa.
- El backend de Notificaciones actual expone envío y consulta por código; el WSDL refleja esas operaciones.
- Farmacia publica iniciar venta y listar productos.
- No existe microservicio 09/Pagos en esta versión; no se publica un proxy Pagos falso.
- Logout JWT es cierre local: no existe revocación de token en la base de datos. El token expira en 30 minutos.
- ActiveMQ usa el listener existente de Notificaciones y eventos de Farmacia. Revisa `services/10-notificaciones/bin/listener.php`; el listener se ejecuta en una terminal independiente con `php bin/listener.php`.
- RENIEC/SUNAT no acceden a internet ni a bases oficiales. Solo responden datos de prueba documentados.

## 11. Solución de problemas

**WSO2 no llega a Auth/Personal:** Auth debe escuchar en `0.0.0.0` (ya corregido en este ZIP), no solo en `127.0.0.1`. El adaptador escucha en `0.0.0.0:8099`. Comprueba `docker exec clinica-wso2mi sh -lc "curl -i http://host.docker.internal:8099/health"`.

**MySQL 1045:** revisa nombre de variable (DB_PASSWORD o DB_PASS según servicio), usuario, contraseña y grants en `database/DB_users.sql`.

**MySQL 2003:** revisa `DB_HOST=127.0.0.1`, `DB_PORT=3307` y que el contenedor MySQL esté activo.

**SOAP devuelve 502:** verifica que el servicio backend y el adaptador estén activos y que el endpoint exista.

**WSDL no aparece:** revisa logs `docker logs --tail 200 clinica-wso2mi` y confirma recursos `registry/config/wsdl` y proxies en `repository/deployment/server/synapse-configs/default/proxy-services`.

**No hay memoria:** arranca solo servicios Python/PHP/Node, y luego un Java cada vez. No cierres Docker ni elimines volúmenes.
