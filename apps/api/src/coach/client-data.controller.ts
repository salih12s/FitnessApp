import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CreateExerciseLogDto } from '../exercise-logs/dto/create-exercise-log.dto.js';
import { HistoryQueryDto } from '../exercise-logs/dto/history-query.dto.js';
import { RecentExerciseLogsQueryDto } from '../exercise-logs/dto/recent-exercise-logs-query.dto.js';
import { ExerciseLogsService } from '../exercise-logs/exercise-logs.service.js';
import { SearchExercisesQueryDto } from '../exercises/dto/search-exercises-query.dto.js';
import { ExercisesService } from '../exercises/exercises.service.js';
import { OverviewQueryDto, ReportQueryDto } from '../reports/reports.dto.js';
import { ReportsService } from '../reports/reports.service.js';
import { TemplatesService } from '../templates/templates.service.js';
import { AssignTemplateDto } from './coach.dto.js';
import { LinkedClientGuard } from './linked-client.guard.js';

/**
 * A linked client's data for their coach. Paths and response shapes mirror
 * the athlete's own endpoints; the services run with the client's id, and
 * logs created here record the coach as `enteredBy`.
 */
@Controller('coach/clients/:clientId')
@UseGuards(AccessTokenGuard, LinkedClientGuard)
export class ClientDataController {
  constructor(
    private readonly exerciseLogs: ExerciseLogsService,
    private readonly exercises: ExercisesService,
    private readonly reports: ReportsService,
    private readonly templates: TemplatesService,
  ) {}

  @Get('history')
  history(
    @Param('clientId') clientId: string,
    @Query() query: HistoryQueryDto,
  ) {
    return this.exerciseLogs.findHistory(clientId, query);
  }

  @Get('reports/overview')
  overview(
    @Param('clientId') clientId: string,
    @Query() query: OverviewQueryDto,
  ) {
    return this.reports.findOverview(clientId, query.offset);
  }

  @Get('reports/exercises')
  reportExercises(@Param('clientId') clientId: string) {
    return this.reports.findExercises(clientId);
  }

  @Get('reports/exercises/custom/:slug')
  customProgress(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reports.findProgress(
      clientId,
      slug,
      query.range ?? 'all',
      true,
    );
  }

  @Get('reports/exercises/:slug')
  progress(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reports.findProgress(clientId, slug, query.range ?? 'all');
  }

  @Get('exercises/search')
  searchExercises(
    @Param('clientId') clientId: string,
    @Query() query: SearchExercisesQueryDto,
  ) {
    return this.exercises.search(clientId, query.q);
  }

  @Get('exercises/custom/:slug')
  customExercise(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
  ) {
    return this.exercises.findBySlug(clientId, slug, true);
  }

  @Get('exercises/:slug')
  exercise(@Param('clientId') clientId: string, @Param('slug') slug: string) {
    return this.exercises.findBySlug(clientId, slug, false);
  }

  @Get('exercises/custom/:slug/logs')
  recentCustomLogs(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Query() query: RecentExerciseLogsQueryDto,
  ) {
    return this.exerciseLogs.findRecentCustom(clientId, slug, query.limit);
  }

  @Get('exercises/:slug/logs')
  recentLogs(
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Query() query: RecentExerciseLogsQueryDto,
  ) {
    return this.exerciseLogs.findRecent(clientId, slug, query.limit);
  }

  @Post('exercises/custom/:slug/logs')
  createCustomLog(
    @Req() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateExerciseLogDto,
  ) {
    return this.exerciseLogs.createCustom(
      clientId,
      slug,
      dto,
      request.user.sub,
    );
  }

  @Post('exercises/:slug/logs')
  createLog(
    @Req() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateExerciseLogDto,
  ) {
    return this.exerciseLogs.create(clientId, slug, dto, request.user.sub);
  }

  @Patch('logs/:id')
  updateLog(
    @Req() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateExerciseLogDto,
  ) {
    return this.exerciseLogs.update(clientId, id, dto, request.user.sub);
  }

  @Delete('logs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLog(
    @Req() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.exerciseLogs.remove(clientId, id, request.user.sub);
  }

  @Post('templates')
  assignTemplate(
    @Req() request: AuthenticatedRequest,
    @Param('clientId') clientId: string,
    @Body() dto: AssignTemplateDto,
  ) {
    return this.templates.assignToClient(
      request.user.sub,
      dto.templateId,
      clientId,
    );
  }
}
