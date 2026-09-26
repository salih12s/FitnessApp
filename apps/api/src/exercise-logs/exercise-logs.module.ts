import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { CustomExerciseLogsController } from './custom-exercise-logs.controller.js';
import { ExerciseLogsController } from './exercise-logs.controller.js';
import { ExerciseLogsService } from './exercise-logs.service.js';
import { HistoryController } from './history.controller.js';
import { LogsController } from './logs.controller.js';

@Module({
  imports: [AuthModule],
  controllers: [
    ExerciseLogsController,
    CustomExerciseLogsController,
    HistoryController,
    LogsController,
  ],
  providers: [ExerciseLogsService],
})
export class ExerciseLogsModule {}
