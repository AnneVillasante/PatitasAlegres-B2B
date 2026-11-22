
import os
from typing import Any

import mysql.connector
from mysql.connector import Error

_connection: Any = None


def conectar():
    global _connection

    if _connection is None or not _connection.is_connected():
        try:
            _connection = mysql.connector.connect(
                host=os.getenv("DB_HOST", "127.0.0.1"),
                port=int(os.getenv("DB_PORT", "3307")),
                database=os.getenv("DB_NAME", "clinica_veterinarios"),
                user=os.getenv("DB_USER"),
                password=os.getenv("DB_PASS"),
                charset="utf8mb4",
                connection_timeout=5
            )

        except Error as error:
            _connection = None
            raise RuntimeError(
                f"Error de conexión a la base de datos: {error}"
            ) from error

    return _connection


def cerrar():
    global _connection

    if _connection is not None:
        if _connection.is_connected():
            _connection.close()

        _connection = None
