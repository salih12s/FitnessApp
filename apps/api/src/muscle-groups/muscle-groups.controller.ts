import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { MuscleGroupsService } from './muscle-groups.service.js';

@Controller('muscle-groups')
@UseGuards(AccessTokenGuard)
export class MuscleGroupsController {
  constructor(private readonly muscleGroupsService: MuscleGroupsService) {}

  @Get()
  findAll(@Req() request: AuthenticatedRequest) {
    return this.muscleGroupsService.findAll(request.user.sub);
  }

  @Get(':slug')
  findBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.muscleGroupsService.findBySlug(request.user.sub, slug);
  }
}
