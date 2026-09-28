import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { DemoModule } from '../demo/demo.module.js';
import { UsersModule } from '../users/users.module.js';
import { UsersController } from '../users/users.controller.js';
import { AccessTokenGuard } from './access-token.guard.js';
import { AuthConfig } from './auth.config.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [DemoModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController, UsersController],
  providers: [AccessTokenGuard, AuthConfig, AuthService],
  exports: [AccessTokenGuard, AuthService],
})
export class AuthModule {}
