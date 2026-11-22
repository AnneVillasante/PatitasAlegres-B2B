<?php

namespace App\Config;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;

    public static function getConnection(): PDO
    {
        if (self::$instance === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                $_ENV['DB_HOST'] ?? '127.0.0.1',
                $_ENV['DB_PORT'] ?? '3307',
                $_ENV['DB_DATABASE'] ?? 'clinica_notificaciones'
            );

            if (($_ENV['DB_USERNAME'] ?? '') === '' || ($_ENV['DB_PASSWORD'] ?? '') === '') { throw new \RuntimeException('Falta configurar DB_USERNAME y DB_PASSWORD en .env'); }
            try {
                self::$instance = new PDO(
                    $dsn,
                    $_ENV['DB_USERNAME'] ?? '',
                    $_ENV['DB_PASSWORD'] ?? '',
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );
            } catch (PDOException $e) {
                throw new \RuntimeException('Error conectando a BD: ' . $e->getMessage(), 0, $e);
            }
        }

        return self::$instance;
    }
}
