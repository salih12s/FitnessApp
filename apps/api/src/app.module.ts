import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module.js';
import { CoachModule } from './coach/coach.module.js';
import { ExerciseLogsModule } from './exercise-logs/exercise-logs.module.js';
import { ExercisesModule } from './exercises/exercises.module.js';
import { ExportModule } from './export/export.module.js';
import { HealthModule } from './health/health.module.js';
import { MeasurementsModule } from './measurements/measurements.module.js';
import { MuscleGroupsModule } from './muscle-groups/muscle-groups.module.js';
import { NutritionModule } from './nutrition/nutrition.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { TemplatesModule } from './templates/templates.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    // Broad per-IP ceiling for every route; auth routes set stricter limits.
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 300 }] }),
    PrismaModule,
    AuthModule,
    CoachModule,
    HealthModule,
    MeasurementsModule,
    MuscleGroupsModule,
    NutritionModule,
    ExercisesModule,
    ExportModule,
    ExerciseLogsModule,
    ReportsModule,
    SessionsModule,
    TemplatesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
