<?php

namespace App\Xml;

use RuntimeException;
use SimpleXMLElement;

class XmlParser
{
    public static function parsear(string $xmlString): array
    {
        if (trim($xmlString) === '') {
            throw new RuntimeException('XML vacío');
        }

        // Evitar declaraciones DOCTYPE y entidades externas.
        if (preg_match('/<!DOCTYPE/i', $xmlString)) {
            throw new RuntimeException('No se permiten declaraciones DOCTYPE');
        }

        $erroresAnteriores = libxml_use_internal_errors(true);

        try {
            libxml_clear_errors();

            $xml = simplexml_load_string(
                $xmlString,
                SimpleXMLElement::class,
                LIBXML_NONET | LIBXML_NOBLANKS
            );

            if ($xml === false) {
                $errores = libxml_get_errors();
                $mensaje = $errores
                    ? trim($errores[0]->message)
                    : 'XML inválido';

                throw new RuntimeException('XML inválido: ' . $mensaje);
            }

            return self::convertir($xml);
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($erroresAnteriores);
        }
    }

    private static function convertir(SimpleXMLElement $nodo): array
    {
        $resultado = [];

        foreach ($nodo->children() as $hijo) {
            $nombre = $hijo->getName();

            if ($hijo->count() > 0) {
                $resultado[$nombre] = self::convertir($hijo);
            } else {
                $valor = trim((string) $hijo);
                $resultado[$nombre] = $valor === '' ? null : $valor;
            }
        }

        return $resultado;
    }
}

