<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/src/Validators/CitaValidator.php';

use App\Validators\CitaValidator;

$_ENV['ESB_HABILITADO'] = 'false';

$casos = [
    [
        'nombre' => 'Cita válida',
        'datos' => [
            'idPropietario' => '2',
            'idMascota' => '5',
            'idVeterinario' => '1',
            'fecha' => '2026-11-25',
            'hora' => '09:30:00'
        ]
    ],
    [
        'nombre' => 'Mascota con ID negativo',
        'datos' => [
            'idPropietario' => '2',
            'idMascota' => '-5',
            'idVeterinario' => '1',
            'fecha' => '2026-11-25',
            'hora' => '09:30:00'
        ]
    ],
    [
        'nombre' => 'Fecha pasada',
        'datos' => [
            'idPropietario' => '2',
            'idMascota' => '5',
            'idVeterinario' => '1',
            'fecha' => '2020-01-01',
            'hora' => '09:30:00'
        ]
    ],
    [
        'nombre' => 'Hora inválida',
        'datos' => [
            'idPropietario' => '2',
            'idMascota' => '5',
            'idVeterinario' => '1',
            'fecha' => '2026-11-25',
            'hora' => '29:90'
        ]
    ]
];

foreach ($casos as $caso) {
    try {
        CitaValidator::validarRegistro($caso['datos']);
        echo $caso['nombre'] . ': ACEPTADO' . PHP_EOL;
    } catch (InvalidArgumentException $e) {
        echo $caso['nombre'] . ': RECHAZADO - ' . $e->getMessage() . PHP_EOL;
    }
}
