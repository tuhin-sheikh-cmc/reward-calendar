<?php

namespace App\Tests\Unit\Controller;

use \Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use \App\Controller\ApiController;
use \Symfony\Component\HttpFoundation\Request;
use \Symfony\Component\HttpFoundation\Response;

/**
 * @covers \App\Controller\ApiController
 */
class ApiControllerTest extends KernelTestCase
{
    /**
     * @test
     * @group api
     */
    public function returnsJsonOutput(): void
    {
        $this->markTestSkipped('skipped valid output test');
        $kernel = self::bootKernel();
        $controller = static::getContainer()->get(ApiController::class);
        $request = Request::create('api/status', 'GET');
        $response = $controller->handleRequest($request);
        //$content = $controller->handleRequest(2, 'status')->getContent();

        $this->assertJson($response->getContent(), 'Response should be in JSON.');
        $this->assertEquals('{"message":"App is up and running and handling requests for: \/api\/v0\/"}', $response->getContent(), "Returned response did not match with expected");
        $this->assertEquals('application/json', $response->getContentType(), "Content-Type did not match");
        // $routerService = static::getContainer()->get('router');
        // $myCustomService = static::getContainer()->get(CustomService::class);
    }

    /**
     * @test
     * @group api
     */
    public function returnsErrorForInvalidPath(): void
    {
        $kernel = self::bootKernel();
        $controller = static::getContainer()->get(ApiController::class);
        $request = Request::create('api/v1/do/something', 'GET');
        $response = $controller->handleRequest($request);
        //$content = $controller->handleRequest(2, 'status')->getContent();

        $this->assertSame(Response::HTTP_BAD_REQUEST, $response->getStatusCode(), "Status code should be 400.");
        $this->assertJson($response->getContent(), 'Response should be in JSON.');
        $this->assertEquals('{"message":"Invalid request path: do\/something", "version": 1, "time": ""}', $response->getContent(), "Returned response did not match with expected");
        $this->assertEquals('application/json', $response->getContentType(), "Content-Type did not match");
        // $routerService = static::getContainer()->get('router');
        // $myCustomService = static::getContainer()->get(CustomService::class);
    }
}
