# Integración SOAP con WSO2 Micro Integrator 4.7.0

## Arquitectura
Los clientes consumen SOAP 1.1 en `http://localhost:8290/services/{ProxyName}`. WSO2 publica el WSDL y reenvía el XML al adaptador de traducción `services/11-soap-adapter` (puerto 8099). El adaptador traduce a los contratos HTTP/XML o HTTP/JSON que realmente implementan los nueve microservicios; las operaciones de negocio siguen ejecutándose en sus servicios y bases de datos originales.

## Proxies
AuthProxy, RegistroProxy, PropietariosProxy, MascotasProxy, VeterinariosProxy, VentaProxy, CitasProxy, FarmaciaProxy, NotificacionesProxy, ReniecProxy y SunatProxy.

## Despliegue
Desde la raíz ejecutar `powershell -ExecutionPolicy Bypass -File .\scripts\deploy-wso2.ps1`. El script copia los proxies y recursos WSDL/XSD al contenedor `clinica-wso2mi`, hace copia de seguridad de proxies con el mismo nombre y no reinicia ni elimina contenedores.

## RENIEC y SUNAT
Son padrones de demostración locales, sin conexión a las plataformas oficiales. DNI demo: `12345678`; RUC demo: `20123456789`. No usar datos reales.

## Importante
La sesión JWT es stateless. El endpoint logout indica cierre local; el token no se revoca en servidor y sigue válido hasta expirar (30 minutos).
