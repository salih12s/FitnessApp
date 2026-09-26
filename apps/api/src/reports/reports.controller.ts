import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { OverviewQueryDto, ReportQueryDto } from './reports.dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
@UseGuards(AccessTokenGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  findOverview(
    @Req() request: AuthenticatedRequest,
    @Query() query: OverviewQueryDto,
  ) {
    return this.reportsService.findOverview(request.user.sub, query.offset);
  }

  @Get('exercises')
  findExercises(@Req() request: AuthenticatedRequest) {
    return this.reportsService.findExercises(request.user.sub);
  }

  @Get('exercises/:slug')
  findProgress(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.findProgress(
      request.user.sub,
      slug,
      query.range ?? 'all',
    );
  }

  @Get('exercises/custom/:slug')
  findCustomProgress(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.findProgress(
      request.user.sub,
      slug,
      query.range ?? 'all',
      true,
    );
  }
}
