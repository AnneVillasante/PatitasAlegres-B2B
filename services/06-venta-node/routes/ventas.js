
const express = require("express");

const PROPIETARIOS_API_URL =
    process.env.PROPIETARIOS_API_URL || "http://127.0.0.1:8003";

module.exports = function (pool) {
    const router = express.Router();

    // Consulta al microservicio 03 usando XML.
    async function consultarPropietario(dni) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <consultarPropietario>
                <dni>${dni}</dni>
            </consultarPropietario>`;

        let response;

        try {
            response = await fetch(
                `${PROPIETARIOS_API_URL}/propietarios/consultar`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/xml; charset=utf-8"
                    },
                    body: xml,
                    signal: AbortSignal.timeout(5000)
                }
            );
        } catch {
            const error = new Error(
                "No se pudo comunicar con el servicio de propietarios"
            );
            error.status = 502;
            throw error;
        }

        const contenido = await response.text();

        if (response.status === 404) {
            const error = new Error("Propietario no encontrado");
            error.status = 404;
            throw error;
        }

        if (!response.ok) {
            const error = new Error(
                "El servicio de propietarios rechazó la consulta"
            );
            error.status = 502;
            throw error;
        }

        const campo = (nombre) => {
            const patron = new RegExp(
                `<${nombre}>([\\s\\S]*?)</${nombre}>`,
                "i"
            );
            const coincidencia = contenido.match(patron);

            if (!coincidencia) return null;

            return coincidencia[1]
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
        };

        const propietario = {
            id: Number(campo("id_propietario")),
            dni: campo("dni"),
            estado: campo("estado")
        };

        if (!propietario.id || !propietario.dni || !propietario.estado) {
            const error = new Error(
                "Respuesta inválida del servicio de propietarios"
            );
            error.status = 502;
            throw error;
        }

        if (propietario.estado !== "ACTIVO") {
            const error = new Error("El propietario no está activo");
            error.status = 409;
            throw error;
        }

        return propietario;
    }

    function manejarError(res, error) {
        console.error("Error en ventas:", error.message);

        return res.status(error.status || 500).json({
            mensaje: error.status ? error.message : "Error interno en ventas"
        });
    }

    // POST /api/ventas
    // Registra una venta pendiente de pago.
    router.post("/", async (req, res) => {
        const { dni, productos } = req.body;

        if (!/^\d{8}$/.test(String(dni || ""))) {
            return res.status(400).json({
                mensaje: "Debes proporcionar un DNI válido de 8 dígitos"
            });
        }

        if (!Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({
                mensaje: "Debes incluir al menos un producto"
            });
        }

        // Agrupa productos repetidos.
        const cantidades = new Map();

        for (const item of productos) {
            const id = Number(item.idProducto);
            const cantidad = Number(item.cantidad);

            if (
                !Number.isSafeInteger(id) || id <= 0 ||
                !Number.isSafeInteger(cantidad) || cantidad <= 0
            ) {
                return res.status(400).json({
                    mensaje: "Cada producto debe tener un ID y cantidad válidos"
                });
            }

            const nuevaCantidad = (cantidades.get(id) || 0) + cantidad;

            if (!Number.isSafeInteger(nuevaCantidad)) {
                return res.status(400).json({
                    mensaje: "Cantidad de productos fuera de rango"
                });
            }

            cantidades.set(id, nuevaCantidad);
        }

        let conexion;

        try {
            const propietario = await consultarPropietario(String(dni));

            conexion = await pool.getConnection();
            await conexion.beginTransaction();

            const lineas = [];
            let totalCentimos = 0;

            for (const [idProducto, cantidad] of
                [...cantidades.entries()].sort((a, b) => a[0] - b[0])) {

                const [filas] = await conexion.query(
                    `SELECT id_producto, nombre, precio, estado
                     FROM productos_accesorios
                     WHERE id_producto = ?
                     FOR UPDATE`,
                    [idProducto]
                );

                if (filas.length === 0) {
                    const error = new Error(
                        `No existe el producto ${idProducto}`
                    );
                    error.status = 404;
                    throw error;
                }

                const producto = filas[0];

                if (producto.estado !== "ACTIVO") {
                    const error = new Error(
                        `El producto ${producto.nombre} no está activo`
                    );
                    error.status = 409;
                    throw error;
                }

                const precioCentimos = Math.round(
                    Number(producto.precio) * 100
                );

                const subtotalCentimos = precioCentimos * cantidad;

                if (!Number.isSafeInteger(subtotalCentimos)) {
                    const error = new Error("Importe fuera de rango");
                    error.status = 400;
                    throw error;
                }

                totalCentimos += subtotalCentimos;

                if (!Number.isSafeInteger(totalCentimos)) {
                    const error = new Error("Total de venta fuera de rango");
                    error.status = 400;
                    throw error;
                }

                lineas.push({
                    idProducto,
                    cantidad,
                    precioCentimos,
                    subtotalCentimos
                });
            }

            const total = (totalCentimos / 100).toFixed(2);

            const [resultado] = await conexion.query(
                `INSERT INTO ventas_accesorios
                    (id_propietario, total, estado)
                 VALUES (?, ?, 'PENDIENTE_PAGO')`,
                [propietario.id, total]
            );

            const idVenta = resultado.insertId;
            const codigoVenta =
                `VEN-${new Date().getFullYear()}-${String(idVenta).padStart(6, "0")}`;

            await conexion.query(
                `UPDATE ventas_accesorios
                 SET codigo_venta = ?
                 WHERE id_venta = ?`,
                [codigoVenta, idVenta]
            );

            for (const linea of lineas) {
                await conexion.query(
                    `INSERT INTO detalle_venta_accesorios
                        (id_venta, id_producto, cantidad,
                         precio_unitario, subtotal)
                     VALUES (?, ?, ?, ?, ?)`,
                    [
                        idVenta,
                        linea.idProducto,
                        linea.cantidad,
                        (linea.precioCentimos / 100).toFixed(2),
                        (linea.subtotalCentimos / 100).toFixed(2)
                    ]
                );
            }

            await conexion.commit();

            return res.status(201).json({
                mensaje: "Venta registrada correctamente",
                venta: {
                    idVenta,
                    codigoVenta,
                    idPropietario: propietario.id,
                    total,
                    estado: "PENDIENTE_PAGO"
                }
            });

        } catch (error) {
            if (conexion) await conexion.rollback();
            return manejarError(res, error);
        } finally {
            if (conexion) conexion.release();
        }
    });

    // GET /api/ventas
    router.get("/", async (req, res) => {
        try {
            const [ventas] = await pool.query(`
                SELECT
                    id_venta AS idVenta,
                    codigo_venta AS codigoVenta,
                    id_propietario AS idPropietario,
                    total,
                    estado,
                    fecha_venta AS fechaVenta
                FROM ventas_accesorios
                ORDER BY id_venta DESC
            `);

            return res.json(ventas);
        } catch (error) {
            return manejarError(res, error);
        }
    });

    // GET /api/ventas/:id
    router.get("/:id", async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "ID de venta inválido"
            });
        }

        try {
            const [ventas] = await pool.query(
                `SELECT
                    id_venta AS idVenta,
                    codigo_venta AS codigoVenta,
                    id_propietario AS idPropietario,
                    total,
                    estado,
                    fecha_venta AS fechaVenta
                 FROM ventas_accesorios
                 WHERE id_venta = ?`,
                [id]
            );

            if (ventas.length === 0) {
                return res.status(404).json({
                    mensaje: "Venta no encontrada"
                });
            }

            const [detalles] = await pool.query(
                `SELECT
                    d.id_producto AS idProducto,
                    p.nombre,
                    d.cantidad,
                    d.precio_unitario AS precioUnitario,
                    d.subtotal
                 FROM detalle_venta_accesorios d
                 INNER JOIN productos_accesorios p
                    ON p.id_producto = d.id_producto
                 WHERE d.id_venta = ?`,
                [id]
            );

            return res.json({
                ...ventas[0],
                detalles
            });

        } catch (error) {
            return manejarError(res, error);
        }
    });

    // PATCH /api/ventas/:id/pagar
    router.patch("/:id/pagar", async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "ID de venta inválido"
            });
        }

        let conexion;

        try {
            conexion = await pool.getConnection();
            await conexion.beginTransaction();

            const [ventas] = await conexion.query(
                `SELECT id_venta, estado
                 FROM ventas_accesorios
                 WHERE id_venta = ?
                 FOR UPDATE`,
                [id]
            );

            if (ventas.length === 0) {
                const error = new Error("Venta no encontrada");
                error.status = 404;
                throw error;
            }

            if (ventas[0].estado !== "PENDIENTE_PAGO") {
                const error = new Error(
                    "La venta no está pendiente de pago"
                );
                error.status = 409;
                throw error;
            }

            const [detalles] = await conexion.query(
                `SELECT id_producto, cantidad
                 FROM detalle_venta_accesorios
                 WHERE id_venta = ?
                 ORDER BY id_producto`,
                [id]
            );

            if (detalles.length === 0) {
                const error = new Error("La venta no tiene productos");
                error.status = 409;
                throw error;
            }

            for (const detalle of detalles) {
                const [productos] = await conexion.query(
                    `SELECT nombre, stock, estado
                     FROM productos_accesorios
                     WHERE id_producto = ?
                     FOR UPDATE`,
                    [detalle.id_producto]
                );

                if (productos.length === 0) {
                    const error = new Error(
                        `No existe el producto ${detalle.id_producto}`
                    );
                    error.status = 409;
                    throw error;
                }

                const producto = productos[0];

                if (producto.estado !== "ACTIVO") {
                    const error = new Error(
                        `El producto ${producto.nombre} está inactivo`
                    );
                    error.status = 409;
                    throw error;
                }

                if (Number(producto.stock) < detalle.cantidad) {
                    const error = new Error(
                        `Stock insuficiente para ${producto.nombre}`
                    );
                    error.status = 409;
                    throw error;
                }

                await conexion.query(
                    `UPDATE productos_accesorios
                     SET stock = stock - ?
                     WHERE id_producto = ?`,
                    [detalle.cantidad, detalle.id_producto]
                );
            }

            await conexion.query(
                `UPDATE ventas_accesorios
                 SET estado = 'PAGADA'
                 WHERE id_venta = ?`,
                [id]
            );

            await conexion.commit();

            return res.json({
                mensaje: "Pago confirmado y stock actualizado",
                idVenta: id,
                estado: "PAGADA"
            });

        } catch (error) {
            if (conexion) await conexion.rollback();
            return manejarError(res, error);
        } finally {
            if (conexion) conexion.release();
        }
    });

    // PATCH /api/ventas/:id/cancelar
    router.patch("/:id/cancelar", async (req, res) => {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                mensaje: "ID de venta inválido"
            });
        }

        let conexion;

        try {
            conexion = await pool.getConnection();
            await conexion.beginTransaction();

            const [ventas] = await conexion.query(
                `SELECT id_venta, estado
                 FROM ventas_accesorios
                 WHERE id_venta = ?
                 FOR UPDATE`,
                [id]
            );

            if (ventas.length === 0) {
                const error = new Error("Venta no encontrada");
                error.status = 404;
                throw error;
            }

            const estado = ventas[0].estado;

            if (estado === "CANCELADA") {
                const error = new Error("La venta ya está cancelada");
                error.status = 409;
                throw error;
            }

            if (estado === "PAGADA") {
                const [detalles] = await conexion.query(
                    `SELECT id_producto, cantidad
                     FROM detalle_venta_accesorios
                     WHERE id_venta = ?
                     ORDER BY id_producto`,
                    [id]
                );

                for (const detalle of detalles) {
                    await conexion.query(
                        `UPDATE productos_accesorios
                         SET stock = stock + ?
                         WHERE id_producto = ?`,
                        [detalle.cantidad, detalle.id_producto]
                    );
                }
            }

            await conexion.query(
                `UPDATE ventas_accesorios
                 SET estado = 'CANCELADA'
                 WHERE id_venta = ?`,
                [id]
            );

            await conexion.commit();

            return res.json({
                mensaje: "Venta cancelada correctamente",
                idVenta: id,
                estado: "CANCELADA"
            });

        } catch (error) {
            if (conexion) await conexion.rollback();
            return manejarError(res, error);
        } finally {
            if (conexion) conexion.release();
        }
    });

    return router;
};
