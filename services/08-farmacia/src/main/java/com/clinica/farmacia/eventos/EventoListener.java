
package com.clinica.farmacia.eventos;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jms.annotation.JmsListener;
import org.springframework.stereotype.Component;

import com.clinica.farmacia.service.SagaCompensacion;
import com.clinica.farmacia.service.VentaService;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;

@Component
public class EventoListener {

    private static final Logger log =
            LoggerFactory.getLogger(EventoListener.class);

    private final VentaService ventaService;
    private final SagaCompensacion sagaCompensacion;
    private final XmlMapper xmlMapper = new XmlMapper();

    public EventoListener(
            VentaService ventaService,
            SagaCompensacion sagaCompensacion) {

        this.ventaService = ventaService;
        this.sagaCompensacion = sagaCompensacion;
    }

    @JmsListener(destination = "topic.PagoConfirmado")
    public void onPagoConfirmado(String payload) {

        Evento evento = parsear(payload);

        procesar(
                () -> ventaService.confirmarPago(evento.getCodigoVenta()),
                evento,
                "confirmar pago"
        );
    }

    @JmsListener(destination = "topic.PagoFallido")
    public void onPagoFallido(String payload) {

        Evento evento = parsear(payload);

        String motivo = evento.getMotivo();

        if (motivo == null || motivo.isBlank()) {
            motivo = "Pago rechazado por el proveedor";
        }

        final String motivoFinal = motivo;

        procesar(
                () -> sagaCompensacion.compensarVenta(
                        evento.getCodigoVenta(),
                        motivoFinal
                ),
                evento,
                "compensar venta"
        );
    }

    private Evento parsear(String payload) {

        try {
            Evento evento = xmlMapper.readValue(payload, Evento.class);

            if (evento.getCodigoVenta() == null
                    || evento.getCodigoVenta().isBlank()) {

                throw new IllegalArgumentException(
                        "El evento no contiene codigoVenta");
            }

            return evento;

        } catch (Exception e) {

            log.error("No se pudo interpretar el evento XML", e);

            throw new IllegalArgumentException(
                    "Evento JMS XML inválido", e
            );
        }
    }

    private void procesar(
            Runnable accion,
            Evento evento,
            String operacion) {

        try {

            accion.run();

            log.info(
                    "Evento procesado correctamente. Operación: {}. Venta: {}",
                    operacion,
                    evento.getCodigoVenta()
            );

        } catch (Exception e) {

            log.error(
                    "Error al {} para la venta {}",
                    operacion,
                    evento.getCodigoVenta(),
                    e
            );

            throw new IllegalStateException(
                    "No se pudo " + operacion
                            + " para la venta "
                            + evento.getCodigoVenta(),
                    e
            );
        }
    }
}

