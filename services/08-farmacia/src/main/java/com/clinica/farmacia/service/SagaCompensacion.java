
package com.clinica.farmacia.service;

import com.clinica.farmacia.entity.DetalleVenta;
import com.clinica.farmacia.entity.Producto;
import com.clinica.farmacia.entity.Venta;
import com.clinica.farmacia.eventos.EventoPublisher;
import com.clinica.farmacia.repository.ProductoRepository;
import com.clinica.farmacia.repository.VentaRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SagaCompensacion {

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;
    private final EventoPublisher eventoPublisher;

    public SagaCompensacion(
            VentaRepository ventaRepository,
            ProductoRepository productoRepository,
            EventoPublisher eventoPublisher) {

        this.ventaRepository = ventaRepository;
        this.productoRepository = productoRepository;
        this.eventoPublisher = eventoPublisher;
    }

    @Transactional
    public void compensarVenta(String codigoVenta, String motivo) {

        Venta venta = ventaRepository
                .findByCodigoVentaParaActualizar(codigoVenta)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Venta no encontrada para compensar: " + codigoVenta));

        // Evitar devolver el inventario más de una vez.
        if ("CANCELADA".equals(venta.getEstado())) {
            return;
        }

        // Una venta pagada no puede compensarse por un pago fallido.
        if (!"PENDIENTE_PAGO".equals(venta.getEstado())) {
            throw new IllegalStateException(
                    "No se puede compensar una venta con estado: "
                            + venta.getEstado());
        }

        for (DetalleVenta detalle : venta.getDetalles()) {

            Producto producto = detalle.getProducto();

            if (producto.getStock() == null) {
                throw new IllegalStateException(
                        "El stock del producto está vacío. ID: "
                                + producto.getId());
            }

            producto.setStock(
                    producto.getStock() + detalle.getCantidad());

            productoRepository.save(producto);
        }

        venta.setEstado("CANCELADA");
        ventaRepository.save(venta);

        eventoPublisher.publicarVentaCancelada(venta, motivo);
    }
}
