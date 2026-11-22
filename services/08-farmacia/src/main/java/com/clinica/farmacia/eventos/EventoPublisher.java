
package com.clinica.farmacia.eventos;

import org.springframework.jms.core.JmsTemplate;
import org.springframework.stereotype.Component;

import com.clinica.farmacia.entity.Venta;
import com.fasterxml.jackson.dataformat.xml.XmlMapper;

@Component
public class EventoPublisher {

    private final JmsTemplate jmsTemplate;
    private final XmlMapper xmlMapper = new XmlMapper();

    public EventoPublisher(JmsTemplate jmsTemplate) {
        this.jmsTemplate = jmsTemplate;
    }

    public void publicarEvento(String destino, Object evento) {
        publicar(destino, evento);
    }

    public void publicarVentaIniciada(Venta venta) {
        Evento evento = new Evento(
                "VentaIniciada",
                venta.getCodigoVenta(),
                venta.getIdPropietario()
        );

        publicar("topic.VentaIniciada", evento);
    }

    public void publicarVentaCompletada(Venta venta) {
        Evento evento = new Evento(
                "VentaCompletada",
                venta.getCodigoVenta(),
                venta.getIdPropietario()
        );

        publicar("topic.VentaCompletada", evento);
    }

    public void publicarVentaCancelada(Venta venta, String motivo) {
        Evento evento = new Evento(
                "VentaCancelada",
                venta.getCodigoVenta(),
                venta.getIdPropietario(),
                motivo
        );

        publicar("topic.VentaCancelada", evento);
    }

    private void publicar(String destino, Object evento) {
        try {
            String payload = xmlMapper.writeValueAsString(evento);

            jmsTemplate.send(
                    destino,
                    session -> session.createTextMessage(payload)
            );

        } catch (Exception e) {
            throw new IllegalStateException(
                    "No se pudo publicar el evento en " + destino,
                    e
            );
        }
    }
}

