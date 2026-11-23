[CmdletBinding()]
param([string]$Container = "clinica-mysql")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$running = docker inspect -f '{{.State.Running}}' $Container 2>$null
if ($running -ne 'true') {
    throw "El contenedor $Container no está activo. Ejecuta primero: docker compose up -d mysql activemq"
}

$seedDemo = @"
import os
import mysql.connector
import bcrypt
from dotenv import load_dotenv

load_dotenv()
host = os.getenv("DB_HOST", "127.0.0.1")
port = int(os.getenv("DB_PORT", "3307"))
password = os.getenv("MYSQL_ROOT_PASSWORD", "root")

def connect(database):
    return mysql.connector.connect(
        host=host, port=port, user="root", password=password, database=database
    )

# 1. Roles y cuentas demo.
conn = connect("clinica_auth")
cur = conn.cursor()

for nombre, descripcion in (
    ("ADMIN", "Administrador del sistema"),
    ("MEDICO", "Personal médico"),
    ("RECEPCIONISTA", "Personal de recepción"),
    ("CLIENTE", "Propietario de mascota"),
):
    cur.execute(
        "INSERT IGNORE INTO roles (nombre, descripcion) VALUES (%s, %s)",
        (nombre, descripcion),
    )
conn.commit()

cur.execute("SELECT id_rol, nombre FROM roles")
roles = {nombre: id_rol for id_rol, nombre in cur.fetchall()}

for antiguo, actual in (("VETERINARIO", "MEDICO"), ("RECEPCION", "RECEPCIONISTA")):
    cur.execute("SELECT id_rol FROM roles WHERE nombre = %s", (antiguo,))
    row = cur.fetchone()
    if row:
        antiguo_id = row[0]
        if antiguo_id != roles[actual]:
            cur.execute("UPDATE usuarios SET id_rol = %s WHERE id_rol = %s", (roles[actual], antiguo_id))
            cur.execute("DELETE FROM roles WHERE id_rol = %s", (antiguo_id,))
conn.commit()

accounts = (
    ("admin_demo", "admin.demo@vetcare.com", "Admin2026!", "ADMIN"),
    ("medico_demo", "medico.demo@vetcare.com", "Medico2026!", "MEDICO"),
    ("recepcion_demo", "recepcion.demo@vetcare.com", "Recepcion2026!", "RECEPCIONISTA"),
    ("cliente_demo", "cliente.demo@vetcare.com", "Cliente2026!", "CLIENTE"),
)

for username, email, plain_password, role_name in accounts:
    password_hash = bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")
    cur.execute(
        """
        INSERT INTO usuarios (username, email, password_hash, id_rol, estado)
        VALUES (%s, %s, %s, %s, 'ACTIVO')
        ON DUPLICATE KEY UPDATE
            username = VALUES(username),
            password_hash = VALUES(password_hash),
            id_rol = VALUES(id_rol),
            estado = 'ACTIVO'
        """,
        (username, email, password_hash, roles[role_name]),
    )
conn.commit()

cur.execute("SELECT id_usuario FROM usuarios WHERE email = 'medico.demo@vetcare.com'")
id_medico_usuario = cur.fetchone()[0]
cur.close()
conn.close()

# 2. Propietario vinculado a cliente_demo y al DNI del padrón RENIEC.
conn = connect("clinica_propietarios")
cur = conn.cursor()
cur.execute(
    """
    INSERT INTO propietarios
        (codigo, dni, nombres, apellidos, telefono, email, direccion, distrito, estado)
    VALUES
        ('PROP-DEMO-01', '71234567', 'SUEMY ANNE KATRINA', 'VILLASANTE VILLASANTE',
         '987654321', 'cliente.demo@vetcare.com', 'Av. Ejército 450', 'Arequipa', 'ACTIVO')
    ON DUPLICATE KEY UPDATE
        nombres = VALUES(nombres),
        apellidos = VALUES(apellidos),
        telefono = VALUES(telefono),
        email = VALUES(email),
        direccion = VALUES(direccion),
        distrito = VALUES(distrito),
        estado = 'ACTIVO'
    """
)
conn.commit()
cur.execute("SELECT id_propietario FROM propietarios WHERE dni = '71234567'")
id_propietario = cur.fetchone()[0]
cur.close()
conn.close()

# 3. Mascota demo.
conn = connect("clinica_mascotas")
cur = conn.cursor()
cur.execute(
    """
    INSERT INTO mascotas
        (codigo, id_propietario, id_especie, id_raza, nombre, sexo, fecha_nacimiento,
         peso_kg, color, numero_chip, observaciones, estado)
    VALUES
        ('MASC-DEMO-01', %s, 1, 1, 'Max', 'MACHO', '2023-05-15', 26.50,
         'Dorado', 'CHIP-900123', 'Paciente demo con vacunas al día', 'ACTIVO')
    ON DUPLICATE KEY UPDATE
        id_propietario = VALUES(id_propietario),
        id_especie = VALUES(id_especie),
        id_raza = VALUES(id_raza),
        nombre = VALUES(nombre),
        sexo = VALUES(sexo),
        fecha_nacimiento = VALUES(fecha_nacimiento),
        peso_kg = VALUES(peso_kg),
        color = VALUES(color),
        observaciones = VALUES(observaciones),
        estado = 'ACTIVO'
    """,
    (id_propietario,),
)
conn.commit()
cur.execute("SELECT id_mascota FROM mascotas WHERE codigo = 'MASC-DEMO-01'")
id_mascota = cur.fetchone()[0]
cur.close()
conn.close()

# 4. Veterinario vinculado a medico_demo.
conn = connect("clinica_veterinarios")
cur = conn.cursor()
cur.execute(
    """
    INSERT INTO veterinarios
        (codigo, id_usuario, nombres, apellidos, colegiatura, id_especialidad, telefono,
         email, horario_inicio, horario_fin, disponible, estado)
    VALUES
        ('VET-DEMO-01', %s, 'Rodrigo', 'Pacheco Salas', 'CMVP-07621', 1,
         '976112244', 'medico.demo@vetcare.com', '08:00:00', '18:00:00', TRUE, 'ACTIVO')
    ON DUPLICATE KEY UPDATE
        id_usuario = VALUES(id_usuario),
        nombres = VALUES(nombres),
        apellidos = VALUES(apellidos),
        id_especialidad = VALUES(id_especialidad),
        telefono = VALUES(telefono),
        email = VALUES(email),
        horario_inicio = VALUES(horario_inicio),
        horario_fin = VALUES(horario_fin),
        disponible = TRUE,
        estado = 'ACTIVO'
    """,
    (id_medico_usuario,),
)
conn.commit()
cur.execute("SELECT id_veterinario FROM veterinarios WHERE codigo = 'VET-DEMO-01'")
id_veterinario = cur.fetchone()[0]
cur.close()
conn.close()

# 5. Cita demo para hoy.
conn = connect("clinica_citas")
cur = conn.cursor()
cur.execute(
    """
    INSERT INTO citas
        (codigo_cita, id_propietario, id_mascota, id_veterinario, id_tipo, fecha, hora,
         motivo, observaciones, estado)
    VALUES
        ('CITA-DEMO-01', %s, %s, %s, 1, CURDATE(), '10:30:00',
         'Control general y vacunación anual',
         'Cita cargada para demostración', 'CONFIRMADA')
    ON DUPLICATE KEY UPDATE
        id_propietario = VALUES(id_propietario),
        id_mascota = VALUES(id_mascota),
        id_veterinario = VALUES(id_veterinario),
        fecha = CURDATE(),
        hora = VALUES(hora),
        motivo = VALUES(motivo),
        observaciones = VALUES(observaciones),
        estado = 'CONFIRMADA'
    """,
    (id_propietario, id_mascota, id_veterinario),
)
conn.commit()
cur.close()
conn.close()

# 6. Receta/historial clínico mínimo vinculado a la cita demo.
try:
    conn = connect("clinica_farmacia")
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO recetas
            (codigo, id_mascota, id_veterinario, id_cita, fecha_emision, observaciones, estado)
        VALUES
            ('REC-DEMO-001', %s, %s, 
             (SELECT id_cita FROM clinica_citas.citas WHERE codigo_cita = 'CITA-DEMO-01'),
             CURDATE(), 'Desparasitación interna y vitaminas', 'DESPACHADA')
        ON DUPLICATE KEY UPDATE
            id_mascota = VALUES(id_mascota),
            id_veterinario = VALUES(id_veterinario),
            fecha_emision = CURDATE(),
            observaciones = VALUES(observaciones),
            estado = 'DESPACHADA'
        """,
        (id_mascota, id_veterinario),
    )
    conn.commit()
    cur.close()
    conn.close()
except mysql.connector.Error:
    pass

print(
    "Datos demo listos -> "
    f"Propietario #{id_propietario}, Mascota #{id_mascota}, "
    f"Veterinario #{id_veterinario}, Cita CITA-DEMO-01"
)
"@

Push-Location (Join-Path $root "services\02-auth")
try {
    $seedPath = Join-Path $env:TEMP "patitas-seed-demo-$PID.py"
    Set-Content -Path $seedPath -Value $seedDemo -Encoding UTF8
    if (Test-Path ".\.venv\Scripts\python.exe") {
        & ".\.venv\Scripts\python.exe" $seedPath
    } elseif (Get-Command py -ErrorAction SilentlyContinue) {
        py $seedPath
    } elseif (Get-Command python -ErrorAction SilentlyContinue) {
        python $seedPath
    } else {
        throw "Se requiere Python para ejecutar la siembra demo."
    }
} finally {
    if ($seedPath -and (Test-Path $seedPath)) {
        Remove-Item -LiteralPath $seedPath -Force
    }
    Pop-Location
}
