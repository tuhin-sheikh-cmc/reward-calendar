<?php

namespace App\Tests\Unit\Controller;

use \Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use \App\Controller\RewardPointsController;

/**
 * @covers \App\Controller\RewardPointsController
 */
class RewardPointsControllerTest extends KernelTestCase
{
    public function testSomething(): void
    {
        $kernel = self::bootKernel();
        $controller = static::getContainer()->get(RewardPointsController::class);

        $this->assertSame('test', $kernel->getEnvironment());
        // $routerService = static::getContainer()->get('router');
        // $myCustomService = static::getContainer()->get(CustomService::class);
    }
}
