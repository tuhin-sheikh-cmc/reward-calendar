<?php

namespace App\Controller;

use \DateTimeImmutable;
use \Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use \Symfony\Component\HttpFoundation\JsonResponse;
use \Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use \Symfony\Component\Routing\Attribute\Route;

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

    #[Route('/api/v{version}/{action}', name: 'api_handler', requirements: ['action' => '.+'])]
    public function handleRequest(
        string $version,
        ?string $action = null
    ): JsonResponse {
        if (
            isset($action)
            && self::assertApiRouteIsValid(intval($version), $action) === false
        ) {
            return $this->json([
                'message' => 'Invalid request path: '. $action,
                'version' => $version,
                'time' => self::getCurrentDateTime()
            ], Response::HTTP_BAD_REQUEST);
        }

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

    private static function assertApiRouteIsValid(
        int $version,
        string $path
    ): bool {
        $parts = explode('/', $path);
        $handler = sprintf(
            "%s/V%d/%s",
            __NAMESPACE__,
            $version,
            $parts[0]
        );
        
        if (!class_exists($handler)) {
            return false;
        }

        return true;
    }
}
