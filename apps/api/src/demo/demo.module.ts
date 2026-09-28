import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { DemoService } from './demo.service.js';

@Module({
  imports: [UsersModule],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
