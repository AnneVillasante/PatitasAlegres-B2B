
const express = require("express");

module.exports = function (pool) {
    const router = express.Router();

    // Validar enteros positivos o cero.
    function esEnteroNoNegativo(valor) {
        return Number.isSafeInteger(valor) && valor >= 0;
    }

    // 1. Listar productos del catálogo.
    router.get("/", async (req, res) => {
        try {
            const [productos] = await pool.query(`
                SELECT
                    p.id_producto AS idProducto,
                    p.codigo,
                    p.nombre,
                    p.descripcion,
                    p.id_categoria AS idCategoria,
                    c.nombre AS categoria,
                    p.precio,
                    p.stock,
                    p.stock_minimo AS stockMinimo,
                    p.estado
                FROM productos_accesorios p
                LEFT JOIN categorias_accesorio c
                    ON p.id_categoria = c.id_categoria
                ORDER BY p.id_producto DESC
            `);

            return res.json(productos);
        } catch (error) {
            console.error("Error al listar productos:", error.message);

            return res.status(500).json({
                mensaje: "Error al consultar los productos"
            });
        }
    });

    // 2. Listar categorías.
    router.get("/categorias", async (req, res) => {
        try {
            const [categorias] = await pool.query(`
                SELECT
                    id_categoria AS idCategoria,
                    nombre
                FROM categorias_accesorio
                ORDER BY nombre
            `);

            return res.json(categorias);
        } catch (error) {
            console.error("Error al listar categorías:", error.message);

            return res.status(500).json({
                mensaje: "Error al consultar las categorías"
            });
        }
    });

    // 3. Registrar un producto.
    router.post("/", async (req, res) => {
        const {
            codigo,
            nombre,
            descripcion,
            idCategoria,
            precio,
            stock,
            stockMinimo
        } = req.body || {};

        // Validar código.
        if (
            codigo !== undefined &&
            codigo !== null &&
            (
                typeof codigo !== "string" ||
                codigo.trim().length === 0 ||
                codigo.trim().length > 20
            )
        ) {
            return res.status(400).json({
                mensaje: "El código debe tener entre 1 y 20 caracteres"
            });
        }

        // Validar nombre.
        if (
            typeof nombre !== "string" ||
            nombre.trim().length === 0 ||
            nombre.trim().length > 100
        ) {
            return res.status(400).json({
                mensaje: "El nombre es obligatorio y admite hasta 100 caracteres"
            });
        }

        // Validar descripción.
        if (
            descripcion !== undefined &&
            descripcion !== null &&
            (
                typeof descripcion !== "string" ||
                descripcion.length > 200
            )
        ) {
            return res.status(400).json({
                mensaje: "La descripción admite hasta 200 caracteres"
            });
        }

        // Validar categoría.
        if (
            !Number.isSafeInteger(idCategoria) ||
            idCategoria <= 0
        ) {
            return res.status(400).json({
                mensaje: "Debes proporcionar una categoría válida"
            });
        }

        // Validar precio.
        const precioNumero = Number(precio);

        if (
            precio === undefined ||
            precio === null ||
            precio === "" ||
            !Number.isFinite(precioNumero) ||
            precioNumero <= 0 ||
            !/^\d+(\.\d{1,2})?$/.test(String(precio)) ||
            precioNumero > 99999999.99
        ) {
            return res.status(400).json({
                mensaje: "El precio debe ser positivo y tener máximo dos decimales"
            });
        }

        // Validar stock.
        const stockInicial = stock === undefined ? 0 : stock;

        if (!esEnteroNoNegativo(stockInicial)) {
            return res.status(400).json({
                mensaje: "El stock debe ser un entero no negativo"
            });
        }

        // Validar stock mínimo.
        const minimo = stockMinimo === undefined ? 5 : stockMinimo;

        if (!esEnteroNoNegativo(minimo)) {
            return res.status(400).json({
                mensaje: "El stock mínimo debe ser un entero no negativo"
            });
        }

        try {
            // Comprobar que la categoría exista.
            const [categorias] = await pool.query(
                `SELECT id_categoria
                 FROM categorias_accesorio
                 WHERE id_categoria = ?`,
                [idCategoria]
            );

            if (categorias.length === 0) {
                return res.status(404).json({
                    mensaje: "La categoría indicada no existe"
                });
            }

            const [resultado] = await pool.query(
                `INSERT INTO productos_accesorios
                    (codigo, nombre, descripcion, id_categoria,
                     precio, stock, stock_minimo, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVO')`,
                [
                    codigo == null ? null : codigo.trim(),
                    nombre.trim(),
                    descripcion == null ? null : descripcion.trim(),
                    idCategoria,
                    precioNumero.toFixed(2),
                    stockInicial,
                    minimo
                ]
            );

            return res.status(201).json({
                mensaje: "Producto registrado correctamente",
                idProducto: resultado.insertId
            });

        } catch (error) {
            console.error("Error al registrar producto:", error.message);

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    mensaje: "Ya existe un producto con ese código"
                });
            }

            return res.status(500).json({
                mensaje: "No se pudo registrar el producto"
            });
        }
    });

    return router;
};
