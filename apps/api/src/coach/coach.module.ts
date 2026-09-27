import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { ExerciseLogsModule } from '../exercise-logs/exercise-logs.module.js';
import { ExercisesModule } from '../exercises/exercises.module.js';
import { ReportsModule } from '../reports/reports.module.js';
import { TemplatesModule } from '../templates/templates.module.js';
import { ClientDataController } from './client-data.controller.js';
import { CoachController } from './coach.controller.js';
import { CoachService } from './coach.service.js';
import { CoachesController } from './coaches.controller.js';
import { LinkedClientGuard } from './linked-client.guard.js';

@Module({
  imports: [
    AuthModule,
    ExerciseLogsModule,
    ExercisesModule,
    ReportsModule,
    TemplatesModule,
  ],
  controllers: [CoachController, CoachesController, ClientDataController],
  providers: [CoachService, LinkedClientGuard],
})
export class CoachModule {}
