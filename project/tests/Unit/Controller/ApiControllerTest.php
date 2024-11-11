<?php

namespace App\Tests\Unit\Controller;

use \Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use \App\Controller\ApiController;
use \Symfony\Component\HttpFoundation\Request;

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
        $kernel = self::bootKernel();
        $controller = static::getContainer()->get(ApiController::class);
        $request = new Request();
        $content = $controller->handleRequest($request)->getContent();

        $this->assertSame('test', $kernel->getEnvironment());
        $this->assertEquals('{"message":"API endpoint requested."}', $content, "Returned response did not match with expected");
        $this->assertJson($content, 'Response should be in JSON.');
        // $routerService = static::getContainer()->get('router');
        // $myCustomService = static::getContainer()->get(CustomService::class);
    }
}
