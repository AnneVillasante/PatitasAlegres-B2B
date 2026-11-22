<?php

namespace App\Validators;

use DateTime;
use InvalidArgumentException;

class CitaValidator
{
    public static function validarRegistro(array $datos): void
    {
        self::validarEnteroPositivo(
            $datos['idVeterinario'] ?? null,
            'El veterinario es obligatorio'
        );

        self::validarEnteroPositivo(
            $datos['idMascota'] ?? null,
            'La mascota es obligatoria'
        );

        $esbHabilitado = filter_var(
            $_ENV['ESB_HABILITADO'] ?? 'false',
            FILTER_VALIDATE_BOOLEAN
        );

        if ($esbHabilitado) {
            $dni = trim((string) ($datos['dniPropietario'] ?? ''));

            if (!preg_match('/^\d{8}$/', $dni)) {
                throw new InvalidArgumentException(
                    'El DNI debe contener exactamente 8 dígitos'
                );
            }
        } else {
            self::validarEnteroPositivo(
                $datos['idPropietario'] ?? null,
                'El propietario debe tener un ID positivo'
            );
        }

        self::validarFecha($datos['fecha'] ?? null);
        self::validarHora($datos['hora'] ?? null);

        if (isset($datos['id_tipo']) && $datos['id_tipo'] !== '') {
            self::validarEnteroPositivo(
                $datos['id_tipo'],
                'El tipo de cita debe ser un ID positivo'
            );
        }

        foreach (['motivo', 'observaciones'] as $campo) {
            if (isset($datos[$campo]) && strlen($datos[$campo]) > ($campo === 'motivo' ? 200 : 10000)) {
                throw new InvalidArgumentException(
                    "El campo {$campo} supera la longitud permitida"
                );
            }
        }
    }

    public static function validarConsulta(array $datos): void
    {
        $codigo = trim((string) ($datos['codigo_cita'] ?? ''));

        if ($codigo === '' || strlen($codigo) > 20) {
            throw new InvalidArgumentException(
                'El código de cita es obligatorio y no debe superar 20 caracteres'
            );
        }
    }

    public static function validarListado(array $datos): void
    {
        self::validarEnteroPositivo(
            $datos['id_propietario'] ?? null,
            'El propietario es obligatorio'
        );
    }

    public static function validarCancelacion(array $datos): void
    {
        $id = $datos['id_cita'] ?? null;
        $codigo = trim((string) ($datos['codigo_cita'] ?? ''));

        if (($id === null || $id === '') && $codigo === '') {
            throw new InvalidArgumentException(
                'Debe indicar el código o ID de la cita'
            );
        }

        if ($id !== null && $id !== '') {
            self::validarEnteroPositivo(
                $id,
                'El ID de cita debe ser positivo'
            );
        }

        if ($codigo !== '' && strlen($codigo) > 20) {
            throw new InvalidArgumentException(
                'El código de cita no debe superar 20 caracteres'
            );
        }

        if ($id !== null && $id !== '' && $codigo !== '') {
            throw new InvalidArgumentException(
                'Indique solamente el ID o el código de la cita'
            );
        }

        if (isset($datos['motivo']) && strlen($datos['motivo']) > 200) {
            throw new InvalidArgumentException(
                'El motivo de cancelación no debe superar 200 caracteres'
            );
        }
    }

    private static function validarFecha($valor): void
    {
        if (!is_string($valor) || trim($valor) === '') {
            throw new InvalidArgumentException('La fecha es obligatoria');
        }

        $fecha = DateTime::createFromFormat('!Y-m-d', $valor);
        $errores = DateTime::getLastErrors();

        if (
            !$fecha ||
            ($errores !== false &&
                ($errores['warning_count'] > 0 || $errores['error_count'] > 0))
        ) {
            throw new InvalidArgumentException(
                'La fecha debe tener formato YYYY-MM-DD y ser válida'
            );
        }

        if ($fecha < new DateTime('today')) {
            throw new InvalidArgumentException(
                'La fecha no puede ser anterior a hoy'
            );
        }
    }

    private static function validarHora($valor): void
    {
        if (!is_string($valor) || trim($valor) === '') {
            throw new InvalidArgumentException('La hora es obligatoria');
        }

        $hora = trim($valor);

        foreach (['!H:i:s', '!H:i'] as $formato) {
            $resultado = DateTime::createFromFormat($formato, $hora);
            $errores = DateTime::getLastErrors();

            if (
                $resultado &&
                ($errores === false ||
                    ($errores['warning_count'] === 0 &&
                     $errores['error_count'] === 0))
            ) {
                return;
            }
        }

        throw new InvalidArgumentException(
            'La hora debe tener formato HH:MM o HH:MM:SS'
        );
    }

    private static function validarEnteroPositivo(
        $valor,
        string $mensaje
    ): void {
        if (
            $valor === null ||
            $valor === '' ||
            filter_var($valor, FILTER_VALIDATE_INT) === false ||
            (int) $valor <= 0
        ) {
            throw new InvalidArgumentException($mensaje);
        }
    }
}

