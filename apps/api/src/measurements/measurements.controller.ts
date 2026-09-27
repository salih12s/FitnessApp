import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CreateMeasurementDto } from './measurement.dto.js';
import { MeasurementsService } from './measurements.service.js';

@Controller('measurements')
@UseGuards(AccessTokenGuard)
export class MeasurementsController {
  constructor(private readonly measurements: MeasurementsService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.measurements.list(request.user.sub);
  }

  @Post()
  create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMeasurementDto,
  ) {
    return this.measurements.create(request.user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.measurements.remove(request.user.sub, id);
  }
}
