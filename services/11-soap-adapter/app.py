import os
import json
import requests
import hashlib
from datetime import datetime, timezone
import xml.etree.ElementTree as ET
from flask import Flask, request, Response, jsonify

app = Flask(__name__)
TIMEOUT = float(os.getenv("BACKEND_TIMEOUT", "20"))
BASE = {
    "auth": os.getenv("AUTH_URL", "http://127.0.0.1:5000"),
    "registro": os.getenv("REGISTRO_URL", "http://127.0.0.1:8080"),
    "propietarios": os.getenv("PROPIETARIOS_URL", "http://127.0.0.1:8003"),
    "mascotas": os.getenv("MASCOTAS_URL", "http://127.0.0.1:8081"),
    "personal": os.getenv("PERSONAL_URL", "http://127.0.0.1:8005"),
    "venta": os.getenv("VENTA_URL", "http://127.0.0.1:3000"),
    "citas": os.getenv("CITAS_URL", "http://127.0.0.1:8007"),
    "farmacia": os.getenv("FARMACIA_URL", "http://127.0.0.1:8008"),
    "notificaciones": os.getenv("NOTIFICACIONES_URL", "http://127.0.0.1:8010"),
    "reniec": os.getenv("RENIEC_URL", "http://127.0.0.1:9001"),
    "sunat": os.getenv("SUNAT_URL", "http://127.0.0.1:9002"),
}
NS = {
    "auth":"http://clinica.com/auth", "registro":"http://clinica.com/registro",
    "propietarios":"http://clinica.com/propietarios", "mascotas":"http://clinica.com/mascotas",
    "personal":"http://clinica.com/personal", "venta":"http://clinica.com/venta",
    "citas":"http://clinica.com/citas", "farmacia":"http://clinica.com/farmacia",
    "notificaciones":"http://clinica.com/notificaciones", "reniec":"http://clinica.com/reniec",
    "sunat":"http://clinica.com/sunat"
}

def local(tag):
    return tag.rsplit('}',1)[-1].split(':')[-1]

def parse_request(raw):
    if not raw or not raw.strip():
        raise ValueError("El cuerpo SOAP/XML está vacío")
    if b'<!DOCTYPE' in raw.upper() or b'<!ENTITY' in raw.upper():
        raise ValueError("No se permiten DTD ni entidades XML")
    root=ET.fromstring(raw)
    if local(root.tag)=="Envelope":
        body=next((x for x in root if local(x.tag)=="Body"),None)
        if body is None or len(body)==0: raise ValueError("SOAP Body vacío")
        root=body[0]
    return root

def to_dict(node):
    out={}
    for child in list(node):
        k=local(child.tag); v=to_dict(child) if len(child) else (child.text or "").strip()
        if k in out:
            if not isinstance(out[k],list): out[k]=[out[k]]
            out[k].append(v)
        else: out[k]=v
    return out

def strip_ns(node):
    node.tag=local(node.tag)
    for c in list(node): strip_ns(c)
    return node

def xml_bytes(node):
    strip_ns(node)
    return ET.tostring(node,encoding="utf-8",xml_declaration=True)

def add_value(parent, key, value):
    if isinstance(value,dict):
        child=ET.SubElement(parent,key)
        for k,v in value.items(): add_value(child,k,v)
    elif isinstance(value,list):
        for item in value: add_value(parent,key,item)
    elif value is None:
        ET.SubElement(parent,key)
    else:
        e=ET.SubElement(parent,key); e.text=str(value)

def xml_response(service, root_name, data, status=200):
    root=ET.Element(f"{{{NS[service]}}}{root_name}")
    if isinstance(data,dict):
        for k,v in data.items(): add_value(root,k,v)
    elif isinstance(data,list):
        for item in data: add_value(root,"item",item)
    else: add_value(root,"resultado",data)
    ET.register_namespace('',NS[service])
    return Response(ET.tostring(root,encoding="utf-8",xml_declaration=True),status=status,content_type="text/xml; charset=utf-8")

def error(service, operation, status, message):
    return xml_response(service, operation.replace("Request","Response"), {"ok":"false","codigo":f"HTTP_{status}","mensaje":message}, status)

def call_json(method,url,data=None):
    r=requests.request(method,url,json=data,timeout=TIMEOUT)
    try: body=r.json()
    except ValueError: body={"respuesta":r.text}
    return r.status_code, body

def call_xml(method,url,node):
    r=requests.request(method,url,data=xml_bytes(node),headers={"Content-Type":"application/xml; charset=utf-8","Accept":"application/xml"},timeout=TIMEOUT)
    try:
        response=ET.fromstring(r.content)
        return r.status_code, response
    except ET.ParseError:
        return r.status_code, {"mensaje":r.text or "Respuesta vacía"}

def rename_xml_response(service, operation, response, status):
    if isinstance(response,ET.Element):
        response.tag=f"{{{NS[service]}}}{operation.replace('Request','Response')}"
        ET.register_namespace('',NS[service])
        return Response(ET.tostring(response,encoding='utf-8',xml_declaration=True),status=status,content_type="text/xml; charset=utf-8")
    return xml_response(service,operation.replace('Request','Response'),response,status)

@app.get('/health')
def health(): return jsonify({"service":"soap-adapter","status":"UP","mode":"REST/XML bridge","backends":list(BASE)})

@app.route('/soap/<service>',methods=['POST'])
def soap_dispatch(service):
    if service not in BASE and service not in ('reniec','sunat'): return jsonify({"error":"Servicio SOAP desconocido"}),404
    try:
        op=parse_request(request.get_data())
        operation=local(op.tag); d=to_dict(op)
        if service in ('reniec','sunat'):
            external_url = BASE[service] + ('/ws/reniec' if service=='reniec' else '/ws/sunat')
            try:
                external=requests.post(external_url,data=request.get_data(),headers={
                    'Content-Type':request.headers.get('Content-Type','application/xml'),
                    'SOAPAction':request.headers.get('SOAPAction','')
                },timeout=TIMEOUT)
                return Response(external.content,status=external.status_code,content_type='text/xml; charset=utf-8')
            except requests.RequestException:
                app.logger.warning('Proveedor externo %s no disponible; usando simulacion local',service)
        # AUTH: REST JSON contract, JWT operations.
        if service=='auth':
            if operation=='loginRequest':
                payload={"email":d.get("email") or d.get("username"),"password":d.get("password"),"rol":d.get("rol")}
                st,b=call_json('POST',BASE['auth']+'/login',payload)
                return xml_response(service,'loginResponse',b,st)
            if operation=='validarTokenRequest':
                st,b=call_json('POST',BASE['auth']+'/validar-token',{"token":d.get("token")})
                return xml_response(service,'validarTokenResponse',b,st)
            if operation=='logoutRequest':
                st,b=call_json('POST',BASE['auth']+'/logout',{"token":d.get("token")})
                return xml_response(service,'logoutResponse',b,st)
        # JAVA REGISTRO REST JSON.
        if service=='registro' and operation=='registrarUsuarioRequest':
            st,b=call_json('POST',BASE[service]+'/api/registro', {k:d.get(k) for k in ('username','email','password')})
            return xml_response(service,'registrarUsuarioResponse',b,st)
        # SPRING MASCOTAS REST JSON.
        if service=='mascotas':
            if operation=='registrarMascotaRequest':
                st,b=call_json('POST',BASE[service]+'/api/mascotas',d); return xml_response(service,'registrarMascotaResponse',b,st)
            if operation=='consultarMascotaRequest':
                mid=d.get('idMascota') or d.get('id')
                if not mid: return error(service,operation,400,'idMascota es obligatorio')
                st,b=call_json('GET',BASE[service]+f'/api/mascotas/{mid}'); return xml_response(service,'consultarMascotaResponse',b,st)
            if operation=='listarMascotasRequest':
                owner=d.get('idPropietario')
                url=BASE[service]+('/api/mascotas/propietario/'+str(owner) if owner else '/api/mascotas')
                st,b=call_json('GET',url); return xml_response(service,'listarMascotasResponse',b,st)
        # NODE VENTAS REST JSON.
        if service=='venta':
            if operation=='listarProductosRequest':
                st,b=call_json('GET',BASE[service]+'/api/productos'); return xml_response(service,'listarProductosResponse',b,st)
            if operation=='iniciarVentaRequest':
                items=d.get('item',[]); items=items if isinstance(items,list) else [items]
                payload={"dni":d.get('dni'),"productos":[{"idProducto":x.get('idProducto'),"cantidad":x.get('cantidad')} for x in items if isinstance(x,dict)]}
                st,b=call_json('POST',BASE[service]+'/api/ventas',payload); return xml_response(service,'iniciarVentaResponse',b,st)
            if operation=='listarVentasRequest':
                st,b=call_json('GET',BASE[service]+'/api/ventas'); return xml_response(service,'listarVentasResponse',b,st)
            if operation=='consultarVentaRequest':
                code=d.get('idVenta') or d.get('codigoVenta')
                st,b=call_json('GET',BASE[service]+'/api/ventas/'+str(code)); return xml_response(service,'consultarVentaResponse',b,st)
        # SPRING FARMACIA accepts XML but expects root iniciarVentaRequest.
        if service=='farmacia':
            if operation=='listarProductosFarmaciaRequest':
                r=requests.get(BASE[service]+'/farmacia/productos',headers={'Accept':'application/xml'},timeout=TIMEOUT)
                try: node=ET.fromstring(r.content)
                except ET.ParseError: node=ET.Element('respuesta'); node.text=r.text
                return rename_xml_response(service,operation,node,r.status_code)
            if operation=='iniciarVentaFarmaciaRequest':
                op.tag='iniciarVentaRequest'
                st,node=call_xml('POST',BASE[service]+'/farmacia/ventas/iniciar',op)
                return rename_xml_response(service,operation,node,st)
        # XML-native PHP and Flask services.
        xml_routes={
            'propietarios': {'registrarPropietarioRequest':'registrar','consultarPropietarioRequest':'consultar','listarPropietariosRequest':'listar','actualizarPropietarioRequest':'actualizar','eliminarPropietarioRequest':'eliminar'},
            'personal': {'registrarVeterinarioRequest':'registrar','consultarVeterinarioRequest':'consultar','listarVeterinariosRequest':'listar','listarDisponiblesRequest':'disponibles','listarEspecialidadesRequest':'especialidades','actualizarDisponibilidadRequest':'disponibilidad'},
            'citas': {'crearCitaRequest':'crear','consultarCitaRequest':'consultar','listarCitasRequest':'listar','cancelarCitaRequest':'cancelar'},
            'notificaciones': {'enviarNotificacionRequest':'enviar','consultarNotificacionRequest':'consultar'},
        }
        if service in xml_routes and operation in xml_routes[service]:
            action=xml_routes[service][operation]
            if service=='personal': url=BASE[service]+'/veterinarios/'+action
            elif service=='propietarios': url=BASE[service]+'/propietarios/'+action
            elif service=='citas': url=BASE[service]+'/citas/'+action
            else:
                if action=='consultar':
                    code=d.get('codigo'); url=BASE[service]+'/notificaciones/consultar/'+str(code)
                    r=requests.get(url,headers={'Accept':'application/xml'},timeout=TIMEOUT)
                    try: node=ET.fromstring(r.content)
                    except ET.ParseError: node={'mensaje':r.text}
                    return rename_xml_response(service,operation,node,r.status_code)
                url=BASE[service]+'/notificaciones/enviar'
            st,node=call_xml('POST',url,op)
            return rename_xml_response(service,operation,node,st)
        # SIMULACIONES LOCALES, sin conexión a plataformas oficiales.
        if service=='reniec' and operation=='consultarDniRequest':
            dni=str(d.get('dni',''))
            if len(dni)!=8 or not dni.isdigit(): return error(service,operation,400,'DNI debe tener 8 dígitos')
            demo={
                '71234567':{'dni':dni,'nombres':'SUEMY ANNE KATRINA','apellidos':'VILLASANTE VILLASANTE','estado':'ACTIVO','ubigeo':'040101'},
                '45678912':{'dni':dni,'nombres':'CARLOS ALBERTO','apellidos':'MENDOZA QUISPE','estado':'ACTIVO','ubigeo':'040109'},
                '12345678':{'dni':dni,'nombres':'MARIA FERNANDA','apellidos':'TORRES LOPEZ','estado':'ACTIVO','ubigeo':'150101'},
                '00000000':{'dni':dni,'nombres':'CIUDADANO','apellidos':'OBSERVADO PRUEBA','estado':'RESTRINGIDO','ubigeo':'000000'}
            }
            if dni not in demo: return xml_response(service,'consultarDniResponse',{'encontrado':'false','mensaje':'DNI no encontrado en el padrón simulado'},404)
            return xml_response(service,'consultarDniResponse',{'encontrado':'true',**demo[dni],'fuente':'SIMULACION LOCAL - NO OFICIAL'},200)
        if service=='sunat' and operation=='consultarRucRequest':
            ruc=str(d.get('ruc',''))
            if len(ruc)!=11 or not ruc.isdigit(): return error(service,operation,400,'RUC debe tener 11 dígitos')
            demo={
                '20601234561':{'ruc':ruc,'razonSocial':'CLINICA VETERINARIA PATITAS ALEGRES S.A.C.','estado':'ACTIVO','condicion':'HABIDO','direccion':'AV. EJERCITO 450, AREQUIPA'},
                '20100047218':{'ruc':ruc,'razonSocial':'DISTRIBUIDORA FARMACEUTICA VET PERU S.A.','estado':'ACTIVO','condicion':'HABIDO','direccion':'CALLE MERCADERES 120, AREQUIPA'},
                '20123456789':{'ruc':ruc,'razonSocial':'EMPRESA DEMO S.A.C.','estado':'ACTIVO','condicion':'HABIDO','direccion':'DIRECCION FICTICIA'}
            }
            if ruc not in demo: return xml_response(service,'consultarRucResponse',{'encontrado':'false','mensaje':'RUC no encontrado en el padrón simulado'},404)
            return xml_response(service,'consultarRucResponse',{'encontrado':'true',**demo[ruc],'fuente':'SIMULACION LOCAL - NO OFICIAL'},200)
        if service=='sunat' and operation=='EmitirComprobanteRequest':
            tipo=str(d.get('tipo','BOLETA')).upper()
            try:
                total=float(d.get('total','0'))
            except (TypeError,ValueError):
                total=0
            if total<=0: return error(service,operation,400,'total debe ser mayor que cero')
            subtotal=round(total/1.18,2)
            igv=round(total-subtotal,2)
            es_factura=tipo=='FACTURA'
            serie='F001' if es_factura else 'B001'
            numero=123456 if es_factura else 654321
            comprobante=f'{serie}-{numero:06d}'
            hash_cdr=hashlib.sha256(f'{comprobante}-{datetime.now(timezone.utc).isoformat()}'.encode()).hexdigest()[:16].upper()
            return xml_response(service,'EmitirComprobanteResponse',{
                'aceptado':'true','comprobante':comprobante,'subtotal':subtotal,
                'igv':igv,'total':round(total,2),'hashCdr':hash_cdr,
                'mensaje':f'Comprobante {comprobante} aceptado por PseudoSUNAT'
            },201)
        return error(service,operation,501,f'Operación {operation} no implementada o no disponible en el backend')
    except requests.RequestException as exc:
        return error(service,operation if 'operation' in locals() else 'soapRequest',502,f'Backend no disponible: {exc.__class__.__name__}')
    except (ET.ParseError,ValueError) as exc:
        return error(service,operation if 'operation' in locals() else 'soapRequest',400,str(exc))
    except Exception:
        app.logger.exception('Error procesando solicitud SOAP')
        return error(service,operation if 'operation' in locals() else 'soapRequest',500,'Error interno del adaptador SOAP')

if __name__=='__main__':
    app.run(host='0.0.0.0',port=int(os.getenv('APP_PORT','8099')),debug=False)
