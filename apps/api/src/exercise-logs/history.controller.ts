import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { HistoryQueryDto } from './dto/history-query.dto.js';
import { ExerciseLogsService } from './exercise-logs.service.js';

@Controller('history')
@UseGuards(AccessTokenGuard)
export class HistoryController {
  constructor(private readonly exerciseLogsService: ExerciseLogsService) {}

  @Get()
  findHistory(
    @Req() request: AuthenticatedRequest,
    @Query() query: HistoryQueryDto,
  ) {
    return this.exerciseLogsService.findHistory(request.user.sub, query);
  }
}
