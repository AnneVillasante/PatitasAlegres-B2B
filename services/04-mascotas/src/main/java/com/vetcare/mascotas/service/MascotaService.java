package com.vetcare.mascotas.service;

import com.vetcare.mascotas.model.Mascota;
import com.vetcare.mascotas.respository.MascotaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.Optional;

@Service
public class MascotaService {

    private final MascotaRepository mascotaRepository;

    public MascotaService(MascotaRepository mascotaRepository) {
        this.mascotaRepository = mascotaRepository;
    }

    public List<Mascota> listarMascotas() {
        return mascotaRepository.findAll();
    }

    public Optional<Mascota> buscarPorId(Integer id) {
        return mascotaRepository.findById(id);
    }

    public List<Mascota> listarPorPropietario(Integer idPropietario) {
        return mascotaRepository.findByIdPropietario(idPropietario);
    }

    public List<Mascota> listarPorEstado(
            Mascota.EstadoMascota estado) {
        return mascotaRepository.findByEstado(estado);
    }

    // REGISTRAR MASCOTA Y GENERAR CODIGO AUTOMATICAMENTE
    @Transactional
    public Mascota registrar(Mascota mascota) {

        mascota.setIdMascota(null);
        mascota.setCodigo(null);
        mascota.setEstado(Mascota.EstadoMascota.ACTIVO);

        // Primer guardado para obtener el ID de MySQL
        Mascota nueva = mascotaRepository.save(mascota);

        // Generar código único utilizando el ID
        String codigo = String.format(
                "MASC-%d-%05d",
                Year.now().getValue(),
                nueva.getIdMascota()
        );

        nueva.setCodigo(codigo);

        // Segundo guardado para persistir el código
        return mascotaRepository.save(nueva);
    }

    // ACTUALIZAR MASCOTA SIN MODIFICAR CODIGO NI ESTADO
    @Transactional
    public Mascota actualizar(Integer id, Mascota datos) {

        Mascota existente = mascotaRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe la mascota con ID " + id));

        // No permitir modificar mascotas inactivas o fallecidas
        if (existente.getEstado() != Mascota.EstadoMascota.ACTIVO) {
            throw new IllegalArgumentException(
                    "No se puede actualizar una mascota que no está activa"
            );
        }

        existente.setIdPropietario(datos.getIdPropietario());
        existente.setIdEspecie(datos.getIdEspecie());
        existente.setIdRaza(datos.getIdRaza());
        existente.setNombre(datos.getNombre());
        existente.setSexo(datos.getSexo());
        existente.setFechaNacimiento(datos.getFechaNacimiento());
        existente.setPesoKg(datos.getPesoKg());
        existente.setColor(datos.getColor());
        existente.setNumeroChip(datos.getNumeroChip());
        existente.setAlergias(datos.getAlergias());
        existente.setObservaciones(datos.getObservaciones());

        // El código y el estado original se conservan
        return mascotaRepository.save(existente);
    }

    // BAJA LOGICA
    @Transactional
    public void eliminar(Integer id) {

        Mascota mascota = mascotaRepository.findById(id)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No existe la mascota con ID " + id));

        if (mascota.getEstado() != Mascota.EstadoMascota.ACTIVO) {
            throw new IllegalArgumentException(
                    "La mascota no está activa y no puede desactivarse nuevamente"
            );
        }

        mascota.setEstado(Mascota.EstadoMascota.INACTIVO);

        mascotaRepository.save(mascota);
    }
}
