import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { OverviewQueryDto } from '../reports/reports.dto.js';
import { CoachModeDto } from './coach.dto.js';
import { CoachService } from './coach.service.js';

/** Coach mode, the invite code, and the coach's client list. */
@Controller('coach')
@UseGuards(AccessTokenGuard)
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get()
  status(@Req() request: AuthenticatedRequest) {
    return this.coachService.getStatus(request.user.sub);
  }

  @Put()
  setMode(@Req() request: AuthenticatedRequest, @Body() dto: CoachModeDto) {
    return this.coachService.setEnabled(request.user.sub, dto.enabled);
  }

  @Post('invite')
  regenerateInvite(@Req() request: AuthenticatedRequest) {
    return this.coachService.regenerateInviteCode(request.user.sub);
  }

  @Get('clients')
  listClients(
    @Req() request: AuthenticatedRequest,
    @Query() query: OverviewQueryDto,
  ) {
    return this.coachService.listClients(request.user.sub, query.offset);
  }

  @Get('clients/:clientId')
  getClient(
    @Req() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.coachService.getClient(request.user.sub, clientId);
  }

  @Delete('clients/:clientId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeClient(
    @Req() request: AuthenticatedRequest,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.coachService.removeClient(request.user.sub, clientId);
  }
}
