<?php

namespace App\Controller;

use \DateTimeImmutable;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class ApiController extends AbstractController
{
    #[Route('/api/status', name: 'api_status')]
    public function handleStatus(Request $request): JsonResponse
    {
        return $this->json([
            'message' => 'App is up and running.',
            'time' => self::getCurrentDateTime()
        ]);
    }

    #[Route('/api/v{version}/{action}', name: 'api_handler')]
    public function handleRequest(
        string $version,
        ?string $action = null
    ): JsonResponse {
        $path = sprintf('/api/v%d/%s', intval($version), $action);
        
        return $this->json([
            'message' => 'App is up and running and handling requests for: '. $path,
            'version' => $version,
            'time' => self::getCurrentDateTime()
        ]);
    }

    private static function getCurrentDateTime(): string
    {
        $date = new DateTimeImmutable("now", new \DateTimeZone('Europe/London'));

        return $date->format(DATE_ATOM);
    }
}
