
import os
import mysql.connector
from mysql.connector import Error


def obtener_conexion():
    try:
        conexion = mysql.connector.connect(
            host=os.getenv("DB_HOST", "127.0.0.1"),
            port=int(os.getenv("DB_PORT", "3307")),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME", "clinica_auth"),
            connection_timeout=5,
            charset="utf8mb4"
        )

        if conexion.is_connected():
            return conexion

        conexion.close()
        return None

    except Error as error:
        print(f"Error al conectar con MySQL: {error}")
        return None
