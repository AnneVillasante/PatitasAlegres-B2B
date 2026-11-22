<?php
namespace App\Xml;

use InvalidArgumentException;
use SimpleXMLElement;

class XmlBuilder
{
    public static function exito(string $rootName, array $datos): string
    {
        $xml = new SimpleXMLElement("<{$rootName}/>");
        self::agregarHijos($xml, $datos);

        return $xml->asXML();
    }

    public static function error(
        string $rootName,
        string $codigo,
        string $mensaje
    ): string {
        $xml = new SimpleXMLElement("<{$rootName}/>");

        self::agregarHijos($xml, [
            'codigo' => $codigo,
            'estado' => 'FALLIDO',
            'mensaje' => $mensaje,
        ]);

        return $xml->asXML();
    }

    public static function lista(
        string $rootName,
        string $itemName,
        array $items
    ): string {
        $xml = new SimpleXMLElement("<{$rootName}/>");

        foreach ($items as $item) {
            $nodo = $xml->addChild($itemName);
            self::agregarHijos($nodo, $item);
        }

        return $xml->asXML();
    }

    private static function agregarHijos(
        SimpleXMLElement $nodo,
        array $datos
    ): void {
        foreach ($datos as $clave => $valor) {
            if (!is_string($clave) || !preg_match('/^[A-Za-z_][A-Za-z0-9_.-]*$/', $clave)) {
                throw new InvalidArgumentException('Nombre de elemento XML inválido');
            }

            if (is_array($valor)) {
                $hijo = $nodo->addChild($clave);
                self::agregarHijos($hijo, $valor);
                continue;
            }

            $nodo->addChild(
                $clave,
                htmlspecialchars(
                    (string) ($valor ?? ''),
                    ENT_XML1 | ENT_QUOTES,
                    'UTF-8'
                )
            );
        }
    }
}

