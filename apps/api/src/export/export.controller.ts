import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { ExportService } from './export.service.js';

@Controller('export')
@UseGuards(AccessTokenGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('logs.csv')
  logsCsv(@Req() request: AuthenticatedRequest) {
    return this.exportService.logsCsv(request.user.sub);
  }
}
