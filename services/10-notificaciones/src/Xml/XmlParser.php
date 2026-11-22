<?php

namespace App\Xml;

use RuntimeException;
use InvalidArgumentException;
use SimpleXMLElement;

class XmlParser
{
    public function parsear(string $xmlString): array
    {
        if (trim($xmlString) === '') {
            throw new RuntimeException('XML vacío');
        }

        // Bloquear declaraciones DTD y ENTITY.
        if (preg_match('/<!DOCTYPE|<!ENTITY/i', $xmlString)) {
            throw new InvalidArgumentException(
                'El XML contiene declaraciones no permitidas'
            );
        }

        // Conservar la configuración global anterior de libxml.
        $previousErrors = libxml_use_internal_errors(true);

        try {
            $xml = simplexml_load_string(
                $xmlString,
                SimpleXMLElement::class,
                LIBXML_NONET | LIBXML_NOBLANKS
            );

            if ($xml === false) {
                $errors = libxml_get_errors();

                $message = $errors
                    ? trim($errors[0]->message)
                    : 'XML inválido';

                throw new InvalidArgumentException(
                    'XML malformado: ' . $message
                );
            }

            return $this->convertir($xml);

        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previousErrors);
        }
    }

    private function convertir(SimpleXMLElement $xml): array
    {
        $result = [];

        foreach ($xml->children() as $child) {
            $name = $child->getName();

            if ($child->count() > 0) {
                $result[$name] = $this->convertir($child);
            } else {
                $value = trim((string) $child);
                $result[$name] = $value !== '' ? $value : null;
            }
        }

        return $result;
    }
}
