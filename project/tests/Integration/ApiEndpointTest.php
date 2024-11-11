<?php

namespace App\Tests\Integration;

use \Symfony\Component\HttpClient\CurlHttpClient;
use \Symfony\Component\HttpClient\HttpOptions;
use \Symfony\Contracts\HttpClient\HttpClientInterface;
use \Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class ApiEndpointTest extends KernelTestCase
{
    private HttpClientInterface $client;

    protected function setUp(): void
    {
        //$container = static::getContainer();
        //$client = $container->get(HttpClientInterface::class);
        $client = new CurlHttpClient();
        $this->client = $client->withOptions(
            (new HttpOptions())
                ->setBaseUri("http://localhost:8080")
                ->toArray()
        );
    }

    /**
     * @test
     * @group API
     */
    public function apiEndpointReturnsJson(): void
    {
        $response = $this->client->request('GET', '/api/status');
        $this->assertEquals(200, $response->getStatusCode(), "Should return OK response.");
        $this->assertJson($response->getContent(), "Response should be in JSON.");
    }

    /**
     * @test
     * @group API
     */
    public function returnErrorWithInvalidRequestPath(): void
    {
        $response = $this->client->request('GET', '/api/v1/do/something');
        $this->assertEquals(400, $response->getStatusCode(), "Should return BAD request.");
    }
}
