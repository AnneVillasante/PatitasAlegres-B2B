<?php
require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/src/Xml/XmlBuilder.php';

use App\Xml\XmlBuilder;

$resultado = XmlBuilder::exito('crearCitaResponse', [
    'estado' => 'CONFIRMADA',
    'mensaje' => 'Consulta & vacunación <especial>',
]);

echo $resultado;
