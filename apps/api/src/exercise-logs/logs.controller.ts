import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CreateExerciseLogDto } from './dto/create-exercise-log.dto.js';
import { ExerciseLogsService } from './exercise-logs.service.js';

@Controller('logs')
@UseGuards(AccessTokenGuard)
export class LogsController {
  constructor(private readonly exerciseLogsService: ExerciseLogsService) {}

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExerciseLogDto,
  ) {
    return this.exerciseLogsService.update(request.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exerciseLogsService.remove(request.user.sub, id);
  }
}
