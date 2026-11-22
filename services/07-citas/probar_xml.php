<?php
require __DIR__ . '/vendor/autoload.php';

require __DIR__ . '/src/Xml/XmlParser.php';

use App\Xml\XmlParser;

$xml = '<crearCita><idMascota>5</idMascota><fecha>2026-11-25</fecha><hora>09:30:00</hora></crearCita>';

try {
    $resultado = XmlParser::parsear($xml);
    print_r($resultado);
} catch (Throwable $e) {
    echo 'ERROR: ' . $e->getMessage();
}
