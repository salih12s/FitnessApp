import {
  BadRequestException,
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

import { PrismaService } from '../prisma/prisma.service.js';
import {
  DailyQuota,
  detectImageType,
  PHOTO_ANALYSIS_SCHEMA,
  PHOTO_MAX_BYTES,
  PHOTO_SYSTEM_PROMPT,
  sanitizeAnalysis,
  type PhotoAnalysis,
} from './photo-analysis.js';

const DEFAULT_MODEL = 'claude-opus-5-5';
const DEFAULT_DAILY_LIMIT = 15;
/** Demo accounts are free and anonymous, so they get a much smaller allowance. */
const DEMO_DAILY_LIMIT = 3;
const DEFAULT_GLOBAL_LIMIT = 300;
const REQUEST_TIMEOUT_MS = 60_000;

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Estimates a meal's calories and macros from a photo with Claude. The photo
 * is sent to the Claude API for this one request and is never stored or
 * logged. Without `ANTHROPIC_API_KEY` the feature is off.
 */
@Injectable()
export class PhotoAnalysisService {
  private readonly logger = new Logger(PhotoAnalysisService.name);
  private readonly client: Anthropic | null;
  private readonly model: string;
  private readonly dailyLimit: number;
  private readonly quota: DailyQuota;

  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = config.get<string>('ANTHROPIC_API_KEY')?.trim();
    this.client = apiKey
      ? new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 })
      : null;
    this.model = config.get<string>('ANTHROPIC_MODEL')?.trim() || DEFAULT_MODEL;

    this.dailyLimit = positiveInteger(
      config.get<string>('PHOTO_ANALYSIS_DAILY_LIMIT'),
      DEFAULT_DAILY_LIMIT,
    );
    this.quota = new DailyQuota(
      positiveInteger(
        config.get<string>('PHOTO_ANALYSIS_GLOBAL_DAILY_LIMIT'),
        DEFAULT_GLOBAL_LIMIT,
      ),
    );
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async analyze(userId: string, image: Buffer): Promise<PhotoAnalysis> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Photo analysis is not configured.',
      );
    }
    if (image.length === 0 || image.length > PHOTO_MAX_BYTES) {
      throw new BadRequestException('The photo must be at most 4 MB.');
    }
    const mediaType = detectImageType(image);
    if (!mediaType) {
      throw new BadRequestException('The photo must be a JPEG, PNG, or WebP.');
    }
    await this.consumeQuota(userId);

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.model,
        max_tokens: 8000,
        system: PHOTO_SYSTEM_PROMPT,
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: PHOTO_ANALYSIS_SCHEMA },
        },
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image.toString('base64'),
                },
              },
              { type: 'text', text: 'Estimate the nutrition of this meal.' },
            ],
          },
        ],
      });
    } catch (error) {
      throw this.toHttpError(error);
    }

    if (response.stop_reason === 'refusal') {
      throw new UnprocessableEntityException(
        'The photo could not be analyzed.',
      );
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || response.stop_reason === 'max_tokens') {
      this.logger.warn(
        `Unusable analysis (stop_reason ${response.stop_reason}).`,
      );
      throw new BadGatewayException('The analysis could not be completed.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      this.logger.warn('The analysis was not valid JSON.');
      throw new BadGatewayException('The analysis could not be completed.');
    }

    return sanitizeAnalysis(parsed);
  }

  private async consumeQuota(userId: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: { isDemo: true },
    });
    const limit = user?.isDemo
      ? Math.min(DEMO_DAILY_LIMIT, this.dailyLimit)
      : this.dailyLimit;

    const result = this.quota.consume(userId, limit, todayKey());
    if (result === 'global') {
      this.logger.warn('The site-wide photo analysis limit was reached.');
      throw new ServiceUnavailableException('Photo analysis is busy.');
    }
    if (result === 'user') {
      throw new HttpException(
        'The daily photo analysis limit was reached.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Maps SDK errors to responses; the details go to the log, not to the user. */
  private toHttpError(error: unknown): HttpException {
    if (error instanceof Anthropic.AuthenticationError) {
      this.logger.error('The Claude API rejected the API key.');
      return new ServiceUnavailableException('Photo analysis is unavailable.');
    }
    if (error instanceof Anthropic.RateLimitError) {
      this.logger.warn('The Claude API rate limit was reached.');
      return new ServiceUnavailableException('Photo analysis is busy.');
    }
    if (error instanceof Anthropic.BadRequestError) {
      this.logger.error(
        `The Claude API rejected the request: ${error.message}`,
      );
      return new BadGatewayException('The analysis could not be completed.');
    }
    if (error instanceof Anthropic.APIConnectionError) {
      this.logger.warn('The Claude API could not be reached.');
      return new ServiceUnavailableException('Photo analysis is unavailable.');
    }
    if (error instanceof Anthropic.APIError) {
      this.logger.error(`Claude API error ${error.status}: ${error.message}`);
      return new BadGatewayException('The analysis could not be completed.');
    }
    this.logger.error(`Unexpected analysis error: ${String(error)}`);
    return new BadGatewayException('The analysis could not be completed.');
  }
}
