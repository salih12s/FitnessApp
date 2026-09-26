import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { TemplatesModule } from '../templates/templates.module.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [AuthModule, TemplatesModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
