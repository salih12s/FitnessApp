import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CreateExerciseLogDto } from './dto/create-exercise-log.dto.js';
import { RecentExerciseLogsQueryDto } from './dto/recent-exercise-logs-query.dto.js';
import { ExerciseLogsService } from './exercise-logs.service.js';

@Controller('exercises/custom/:slug/logs')
@UseGuards(AccessTokenGuard)
export class CustomExerciseLogsController {
  constructor(private readonly exerciseLogsService: ExerciseLogsService) {}

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: CreateExerciseLogDto,
  ) {
    return this.exerciseLogsService.createCustom(request.user.sub, slug, dto);
  }

  @Get()
  findRecent(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Query() query: RecentExerciseLogsQueryDto,
  ) {
    return this.exerciseLogsService.findRecentCustom(
      request.user.sub,
      slug,
      query.limit,
    );
  }
}
