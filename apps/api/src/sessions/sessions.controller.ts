import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import {
  FinishSessionDto,
  StartSessionDto,
  UpdateSessionDto,
} from './session.dto.js';
import { SessionsService } from './sessions.service.js';

@Controller('sessions')
@UseGuards(AccessTokenGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  start(@Req() request: AuthenticatedRequest, @Body() dto: StartSessionDto) {
    return this.sessionsService.start(request.user.sub, dto.templateId);
  }

  @Get('active')
  async findActive(@Req() request: AuthenticatedRequest) {
    return {
      session: await this.sessionsService.findActive(request.user.sub),
    };
  }

  @Patch(':id')
  update(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.sessionsService.updateNote(request.user.sub, id, dto.note);
  }

  @Post(':id/finish')
  @HttpCode(200)
  async finish(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishSessionDto,
  ) {
    return {
      session: await this.sessionsService.finish(
        request.user.sub,
        id,
        dto.note,
      ),
    };
  }
}
