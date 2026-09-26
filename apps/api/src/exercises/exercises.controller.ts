import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto.js';
import { ListExercisesQueryDto } from './dto/list-exercises-query.dto.js';
import { RenameExerciseDto } from './dto/rename-exercise.dto.js';
import { SearchExercisesQueryDto } from './dto/search-exercises-query.dto.js';
import { ExercisesService } from './exercises.service.js';

@Controller('exercises')
@UseGuards(AccessTokenGuard)
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findByMuscleGroup(
    @Req() request: AuthenticatedRequest,
    @Query() query: ListExercisesQueryDto,
  ) {
    return this.exercisesService.findByMuscleGroup(
      request.user.sub,
      query.muscleGroup,
    );
  }

  @Get('search')
  search(
    @Req() request: AuthenticatedRequest,
    @Query() query: SearchExercisesQueryDto,
  ) {
    return this.exercisesService.search(request.user.sub, query.q);
  }

  @Post('custom')
  createCustom(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomExerciseDto,
  ) {
    return this.exercisesService.createCustom(request.user.sub, dto);
  }

  @Get('custom/:slug')
  findCustomBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.exercisesService.findBySlug(request.user.sub, slug, true);
  }

  @Get(':slug')
  findBySlug(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.exercisesService.findBySlug(request.user.sub, slug, false);
  }

  @Patch('custom/:slug')
  renameCustom(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: RenameExerciseDto,
  ) {
    return this.exercisesService.rename(request.user.sub, slug, true, dto.name);
  }

  @Patch(':slug')
  rename(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
    @Body() dto: RenameExerciseDto,
  ) {
    return this.exercisesService.rename(
      request.user.sub,
      slug,
      false,
      dto.name,
    );
  }

  @Delete('custom/:slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCustom(
    @Req() request: AuthenticatedRequest,
    @Param('slug') slug: string,
  ) {
    return this.exercisesService.remove(request.user.sub, slug, true);
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Req() request: AuthenticatedRequest, @Param('slug') slug: string) {
    return this.exercisesService.remove(request.user.sub, slug, false);
  }
}
