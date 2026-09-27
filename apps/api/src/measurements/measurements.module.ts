import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { MeasurementsController } from './measurements.controller.js';
import { MeasurementsService } from './measurements.service.js';

@Module({
  imports: [AuthModule],
  controllers: [MeasurementsController],
  providers: [MeasurementsService],
})
export class MeasurementsModule {}
