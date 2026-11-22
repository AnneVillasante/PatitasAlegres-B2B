
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");

const crearRutasProductos = require("./routes/productos");
const crearRutasVentas = require("./routes/ventas");

const app = express();

const PORT = Number(process.env.PORT || 3000);

const variablesObligatorias = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME"
];

for (const variable of variablesObligatorias) {
    if (!process.env[variable]) {
        throw new Error(`Falta configurar ${variable} en .env`);
    }
}

app.use(cors());
app.use(express.json({ limit: "100kb" }));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true
});

app.get("/", (req, res) => {
    res.json({
        mensaje: "Microservicio de ventas VetCare funcionando"
    });
});

app.get("/api/salud", async (req, res) => {
    try {
        const [filas] = await pool.query(
            "SELECT DATABASE() AS baseDatos"
        );

        res.json({
            servicio: "Ventas Node.js",
            estado: "conectado",
            baseDatos: filas[0].baseDatos
        });
    } catch (error) {
        console.error("Error de MySQL:", error.message);

        res.status(500).json({
            estado: "error",
            mensaje: "No se pudo conectar con MySQL"
        });
    }
});

app.use("/api/productos", crearRutasProductos(pool));
app.use("/api/ventas", crearRutasVentas(pool));

app.use((error, req, res, next) => {
    console.error("Error no controlado:", error.message);

    res.status(500).json({
        mensaje: "Error interno del servidor"
    });
});

async function iniciarServidor() {
    const conexion = await pool.getConnection();

    try {
        await conexion.ping();
        console.log("Conexión a MySQL establecida correctamente.");
    } finally {
        conexion.release();
    }

    app.listen(PORT, () => {
        console.log(
            `Servicio de ventas disponible en http://localhost:${PORT}`
        );
    });
}

iniciarServidor().catch(async (error) => {
    console.error("No se pudo iniciar el servicio:", error.message);
    await pool.end();
    process.exit(1);
});

module.exports = { app, pool };
