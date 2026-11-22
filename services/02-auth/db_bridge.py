import os
import decimal
import datetime
import mysql.connector

# Catálogo oficial de bases de datos y usuarios según database/DB_users.sql
TABLE_CATALOG = {
    # clinica_auth -> svc_auth
    'roles': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_rol', 'is_log': False},
    'usuarios': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_usuario', 'is_log': False},
    'permisos': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_permiso', 'is_log': False},
    'roles_permisos': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_rol', 'is_log': False},
    'sesiones': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_sesion', 'is_log': False},
    'auditoria_accesos': {'db': 'clinica_auth', 'user': 'svc_auth', 'pk': 'id_auditoria', 'is_log': True},
    
    # clinica_dashboard -> svc_dashboard
    'metricas_diarias': {'db': 'clinica_dashboard', 'user': 'svc_dashboard', 'pk': 'id_metrica', 'is_log': False},
    'cache_kpis': {'db': 'clinica_dashboard', 'user': 'svc_dashboard', 'pk': 'id_kpi', 'is_log': False},
    
    # clinica_propietarios -> svc_propietarios
    'propietarios': {'db': 'clinica_propietarios', 'user': 'svc_propietarios', 'pk': 'id_propietario', 'is_log': False},
    'contactos_emergencia': {'db': 'clinica_propietarios', 'user': 'svc_propietarios', 'pk': 'id_contacto', 'is_log': False},
    
    # clinica_mascotas -> svc_mascotas
    'especies': {'db': 'clinica_mascotas', 'user': 'svc_mascotas', 'pk': 'id_especie', 'is_log': False},
    'razas': {'db': 'clinica_mascotas', 'user': 'svc_mascotas', 'pk': 'id_raza', 'is_log': False},
    'mascotas': {'db': 'clinica_mascotas', 'user': 'svc_mascotas', 'pk': 'id_mascota', 'is_log': False},
    
    # clinica_veterinarios -> svc_veterinarios
    'especialidades': {'db': 'clinica_veterinarios', 'user': 'svc_veterinarios', 'pk': 'id_especialidad', 'is_log': False},
    'veterinarios': {'db': 'clinica_veterinarios', 'user': 'svc_veterinarios', 'pk': 'id_veterinario', 'is_log': False},
    'tecnicos': {'db': 'clinica_veterinarios', 'user': 'svc_veterinarios', 'pk': 'id_tecnico', 'is_log': False},
    'horarios_atencion': {'db': 'clinica_veterinarios', 'user': 'svc_veterinarios', 'pk': 'id_horario', 'is_log': False},
    
    # clinica_accesorios -> svc_accesorios
    'categorias_accesorio': {'db': 'clinica_accesorios', 'user': 'svc_accesorios', 'pk': 'id_categoria', 'is_log': False},
    'productos_accesorios': {'db': 'clinica_accesorios', 'user': 'svc_accesorios', 'pk': 'id_producto', 'is_log': False},
    'ventas_accesorios': {'db': 'clinica_accesorios', 'user': 'svc_accesorios', 'pk': 'id_venta', 'is_log': False},
    'detalle_venta_accesorios': {'db': 'clinica_accesorios', 'user': 'svc_accesorios', 'pk': 'id_detalle', 'is_log': False},
    
    # clinica_citas -> svc_citas
    'tipos_cita': {'db': 'clinica_citas', 'user': 'svc_citas', 'pk': 'id_tipo', 'is_log': False},
    'estados_cita': {'db': 'clinica_citas', 'user': 'svc_citas', 'pk': 'id_estado', 'is_log': False},
    'citas': {'db': 'clinica_citas', 'user': 'svc_citas', 'pk': 'id_cita', 'is_log': False},
    'historial_reprogramaciones': {'db': 'clinica_citas', 'user': 'svc_citas', 'pk': 'id_historial', 'is_log': True},
    
    # clinica_farmacia -> svc_farmacia
    'categorias_farmaco': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_categoria', 'is_log': False},
    'productos_farmacia': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_producto', 'is_log': False},
    'recetas': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_receta', 'is_log': False},
    'detalle_receta': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_detalle', 'is_log': False},
    'ventas_farmacia': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_venta', 'is_log': False},
    'detalle_venta_farmacia': {'db': 'clinica_farmacia', 'user': 'svc_farmacia', 'pk': 'id_detalle', 'is_log': False},
    
    # clinica_pagos -> svc_pagos
    'metodos_pago': {'db': 'clinica_pagos', 'user': 'svc_pagos', 'pk': 'id_metodo', 'is_log': False},
    'pagos': {'db': 'clinica_pagos', 'user': 'svc_pagos', 'pk': 'id_pago', 'is_log': False},
    'transacciones': {'db': 'clinica_pagos', 'user': 'svc_pagos', 'pk': 'id_transaccion', 'is_log': True},
    'comprobantes': {'db': 'clinica_pagos', 'user': 'svc_pagos', 'pk': 'id_comprobante', 'is_log': False},
    
    # clinica_notificaciones -> svc_notificaciones
    'plantillas_notificacion': {'db': 'clinica_notificaciones', 'user': 'svc_notificaciones', 'pk': 'id_plantilla', 'is_log': False},
    'notificaciones': {'db': 'clinica_notificaciones', 'user': 'svc_notificaciones', 'pk': 'id_notificacion', 'is_log': False},
    'recordatorios_programados': {'db': 'clinica_notificaciones', 'user': 'svc_notificaciones', 'pk': 'id_recordatorio', 'is_log': False},
    'log_envios': {'db': 'clinica_notificaciones', 'user': 'svc_notificaciones', 'pk': 'id_log', 'is_log': True},
}

def obtener_conexion_tabla(nombre_tabla: str):
    info = TABLE_CATALOG.get(nombre_tabla)
    if not info:
        return None, None
    
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = int(os.getenv("DB_PORT", "3307"))
    
    clave_bd = info['db'].upper()
    variable_password = f"DB_PASSWORD_{clave_bd}"
    password = os.getenv(variable_password)
    if not password:
        raise RuntimeError(f"Falta configurar {variable_password} en services/02-auth/.env")

    conexion = mysql.connector.connect(
        host=host,
        port=port,
        database=info['db'],
        user=info['user'],
        password=password,
        connection_timeout=3
    )
    return conexion, info

def serializar_fila(fila: dict) -> dict:
    resultado = {}
    for k, v in fila.items():
        if isinstance(v, decimal.Decimal):
            resultado[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            resultado[k] = v.isoformat()
        elif isinstance(v, datetime.timedelta):
            # Formatear timedelta como HH:MM:SS
            total_segundos = int(v.total_seconds())
            horas = total_segundos // 3600
            minutos = (total_segundos % 3600) // 60
            segundos = total_segundos % 60
            resultado[k] = f"{horas:02d}:{minutos:02d}:{segundos:02d}"
        else:
            resultado[k] = v
    return resultado

def listar_registros(nombre_tabla: str):
    conexion, info = obtener_conexion_tabla(nombre_tabla)
    if not conexion:
        raise ValueError(f"Tabla '{nombre_tabla}' no reconocida en el catálogo.")
    
    cursor = conexion.cursor(dictionary=True)
    try:
        # Sanitizar nombre de tabla validado contra TABLE_CATALOG
        cursor.execute(f"SELECT * FROM `{nombre_tabla}`")
        filas = cursor.fetchall()
        return [serializar_fila(f) for f in filas]
    finally:
        cursor.close()
        conexion.close()

def insertar_registro(nombre_tabla: str, datos: dict):
    conexion, info = obtener_conexion_tabla(nombre_tabla)
    if not conexion:
        raise ValueError(f"Tabla '{nombre_tabla}' no reconocida.")
    if info['is_log']:
        raise PermissionError(f"La tabla '{nombre_tabla}' es de SOLO LECTURA (Log/Auditoría).")
    
    # Filtrar solo columnas válidas
    cursor = conexion.cursor(dictionary=True)
    try:
        cursor.execute(f"DESCRIBE `{nombre_tabla}`")
        columnas_db = [c['Field'] for c in cursor.fetchall()]
        
        columnas_insert = []
        valores_insert = []
        placeholders = []
        
        for col, val in datos.items():
            if col in columnas_db and col != info['pk']: # Evitar PK autoincrement
                columnas_insert.append(f"`{col}`")
                valores_insert.append(val)
                placeholders.append("%s")
        
        sql = f"INSERT INTO `{nombre_tabla}` ({', '.join(columnas_insert)}) VALUES ({', '.join(placeholders)})"
        cursor.execute(sql, tuple(valores_insert))
        conexion.commit()
        
        nuevo_id = cursor.lastrowid
        datos[info['pk']] = nuevo_id
        return datos
    finally:
        cursor.close()
        conexion.close()

def actualizar_registro(nombre_tabla: str, id_registro, datos: dict):
    conexion, info = obtener_conexion_tabla(nombre_tabla)
    if not conexion:
        raise ValueError(f"Tabla '{nombre_tabla}' no reconocida.")
    if info['is_log']:
        raise PermissionError(f"La tabla '{nombre_tabla}' es de SOLO LECTURA (Log/Auditoría).")
    
    cursor = conexion.cursor(dictionary=True)
    try:
        cursor.execute(f"DESCRIBE `{nombre_tabla}`")
        columnas_db = [c['Field'] for c in cursor.fetchall()]
        
        sets = []
        valores = []
        for col, val in datos.items():
            if col in columnas_db and col != info['pk']:
                sets.append(f"`{col}` = %s")
                valores.append(val)
        
        valores.append(id_registro)
        sql = f"UPDATE `{nombre_tabla}` SET {', '.join(sets)} WHERE `{info['pk']}` = %s"
        cursor.execute(sql, tuple(valores))
        conexion.commit()
        return datos
    finally:
        cursor.close()
        conexion.close()

def eliminar_registro(nombre_tabla: str, id_registro):
    conexion, info = obtener_conexion_tabla(nombre_tabla)
    if not conexion:
        raise ValueError(f"Tabla '{nombre_tabla}' no reconocida.")
    if info['is_log']:
        raise PermissionError(f"La tabla '{nombre_tabla}' es de SOLO LECTURA (Log/Auditoría).")
    
    cursor = conexion.cursor()
    try:
        sql = f"DELETE FROM `{nombre_tabla}` WHERE `{info['pk']}` = %s"
        cursor.execute(sql, (id_registro,))
        conexion.commit()
        return True
    finally:
        cursor.close()
        conexion.close()

