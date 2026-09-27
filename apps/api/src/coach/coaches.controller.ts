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
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { AcceptInviteDto } from './coach.dto.js';
import { CoachService } from './coach.service.js';

/** The athlete's side of coaching: their coaches and invite acceptance. */
@Controller('coaches')
@UseGuards(AccessTokenGuard)
export class CoachesController {
  constructor(private readonly coachService: CoachService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.coachService.listCoaches(request.user.sub);
  }

  @Get('invites/:code')
  preview(@Req() request: AuthenticatedRequest, @Param('code') code: string) {
    return this.coachService.previewInvite(request.user.sub, code);
  }

  @Post()
  accept(@Req() request: AuthenticatedRequest, @Body() dto: AcceptInviteDto) {
    return this.coachService.acceptInvite(request.user.sub, dto.code);
  }

  @Delete(':coachId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('coachId', ParseUUIDPipe) coachId: string,
  ) {
    return this.coachService.removeCoach(request.user.sub, coachId);
  }
}
