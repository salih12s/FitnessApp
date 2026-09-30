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
  Put,
  PayloadTooLargeException,
  Query,
  Req,
  UnsupportedMediaTypeException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';

import { AccessTokenGuard } from '../auth/access-token.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import {
  BatchEntriesDto,
  CatalogQueryDto,
  CopyEntriesDto,
  CreateFoodEntryDto,
  NutritionGoalDto,
  SavedFoodDto,
  SummaryQueryDto,
  UpdateFoodEntryDto,
} from './nutrition.dto.js';
import { NutritionService } from './nutrition.service.js';
import { PHOTO_MAX_BYTES } from './photo-analysis.js';
import { PhotoAnalysisService } from './photo-analysis.service.js';

@Controller('nutrition')
@UseGuards(AccessTokenGuard)
export class NutritionController {
  constructor(
    private readonly nutrition: NutritionService,
    private readonly photoAnalysis: PhotoAnalysisService,
  ) {}

  /** Which optional features this server has, so the app can hide the rest. */
  @Get('features')
  getFeatures() {
    return { photoAnalysis: this.photoAnalysis.isEnabled };
  }

  @Get('days/:date')
  getDay(@Req() request: AuthenticatedRequest, @Param('date') date: string) {
    return this.nutrition.getDay(request.user.sub, date);
  }

  @Get('summary')
  getSummary(
    @Req() request: AuthenticatedRequest,
    @Query() query: SummaryQueryDto,
  ) {
    return this.nutrition.getSummary(request.user.sub, query.to, query.days);
  }

  @Post('entries')
  createEntry(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateFoodEntryDto,
  ) {
    return this.nutrition.createEntry(request.user.sub, dto);
  }

  @Post('entries/batch')
  createEntries(
    @Req() request: AuthenticatedRequest,
    @Body() dto: BatchEntriesDto,
  ) {
    return this.nutrition.createEntries(request.user.sub, dto);
  }

  @Patch('entries/:id')
  updateEntry(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFoodEntryDto,
  ) {
    return this.nutrition.updateEntry(request.user.sub, id, dto);
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEntry(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.nutrition.deleteEntry(request.user.sub, id);
  }

  @Post('copy')
  @HttpCode(HttpStatus.OK)
  copyEntries(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CopyEntriesDto,
  ) {
    return this.nutrition.copyEntries(request.user.sub, dto);
  }

  @Get('goal')
  getGoal(@Req() request: AuthenticatedRequest) {
    return this.nutrition.getGoal(request.user.sub);
  }

  @Put('goal')
  setGoal(@Req() request: AuthenticatedRequest, @Body() dto: NutritionGoalDto) {
    return this.nutrition.setGoal(request.user.sub, dto);
  }

  @Delete('goal')
  @HttpCode(HttpStatus.NO_CONTENT)
  clearGoal(@Req() request: AuthenticatedRequest) {
    return this.nutrition.clearGoal(request.user.sub);
  }

  @Get('catalog')
  searchCatalog(@Query() query: CatalogQueryDto) {
    return { results: this.nutrition.searchCatalog(query.q) };
  }

  /** Open Food Facts asks for modest use, so this has its own tight limit. */
  @Get('catalog/packaged')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async searchPackaged(@Query() query: CatalogQueryDto) {
    return { results: await this.nutrition.searchPackaged(query.q) };
  }

  /** Body is the raw image (see main.ts); nothing is stored. */
  @Post('photo-analysis')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  analyzePhoto(@Req() request: AuthenticatedRequest & Request) {
    const body: unknown = request.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new UnsupportedMediaTypeException(
        'Send the photo as image/jpeg, image/png, or image/webp.',
      );
    }
    if (body.length > PHOTO_MAX_BYTES) {
      throw new PayloadTooLargeException('The photo must be at most 4 MB.');
    }
    return this.photoAnalysis.analyze(request.user.sub, body);
  }

  @Get('foods')
  listFoods(@Req() request: AuthenticatedRequest) {
    return this.nutrition.listFoods(request.user.sub);
  }

  @Post('foods')
  saveFood(@Req() request: AuthenticatedRequest, @Body() dto: SavedFoodDto) {
    return this.nutrition.saveFood(request.user.sub, dto);
  }

  @Delete('foods/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteFood(
    @Req() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.nutrition.deleteFood(request.user.sub, id);
  }
}
