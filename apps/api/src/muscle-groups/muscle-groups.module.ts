import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MuscleGroupsController } from './muscle-groups.controller.js';
import { MuscleGroupsService } from './muscle-groups.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MuscleGroupsController],
  providers: [MuscleGroupsService],
})
export class MuscleGroupsModule {}
