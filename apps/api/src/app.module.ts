import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module.js';
import { ExerciseLogsModule } from './exercise-logs/exercise-logs.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { HealthModule } from './health/health.module.js';
import { MuscleGroupsModule } from './muscle-groups/muscle-groups.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    PrismaModule,
    AuthModule,
    HealthModule,
    MuscleGroupsModule,
    ExercisesModule,
    ExerciseLogsModule,
    ReportsModule,
  ],
})
export class AppModule {}
