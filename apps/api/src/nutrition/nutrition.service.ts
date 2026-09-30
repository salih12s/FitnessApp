import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type {
  BatchEntriesDto,
  CopyEntriesDto,
  CreateFoodEntryDto,
  NutritionGoalDto,
  SavedFoodDto,
  UpdateFoodEntryDto,
} from './nutrition.dto.js';
import { searchCatalog, type CatalogFood } from './food-catalog.js';
import {
  PackagedFoodsUnavailableError,
  searchPackagedFoods,
} from './open-food-facts.js';
import {
  clampSummaryDays,
  groupByMeal,
  MAX_ENTRIES_PER_DAY,
  MAX_SAVED_FOODS,
  parseDateOnly,
  shiftDate,
  sumMacros,
  toDateKey,
  type Meal,
} from './nutrition-math.js';

type Decimalish = { toNumber(): number };

const entrySelect = {
  id: true,
  eatenOn: true,
  meal: true,
  name: true,
  servingLabel: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
  note: true,
} as const;

const foodSelect = {
  id: true,
  name: true,
  servingLabel: true,
  calories: true,
  proteinG: true,
  carbsG: true,
  fatG: true,
} as const;

interface EntryRow {
  id: string;
  eatenOn: Date;
  meal: Meal;
  name: string;
  servingLabel: string | null;
  calories: number;
  proteinG: Decimalish;
  carbsG: Decimalish;
  fatG: Decimalish;
  note: string | null;
}

interface FoodRow {
  id: string;
  name: string;
  servingLabel: string | null;
  calories: number;
  proteinG: Decimalish;
  carbsG: Decimalish;
  fatG: Decimalish;
}

function toEntry(row: EntryRow) {
  return {
    id: row.id,
    eatenOn: toDateKey(row.eatenOn),
    meal: row.meal,
    name: row.name,
    servingLabel: row.servingLabel,
    calories: row.calories,
    proteinG: row.proteinG.toNumber(),
    carbsG: row.carbsG.toNumber(),
    fatG: row.fatG.toNumber(),
    note: row.note,
  };
}

function toFood(row: FoodRow) {
  return {
    id: row.id,
    name: row.name,
    servingLabel: row.servingLabel,
    calories: row.calories,
    proteinG: row.proteinG.toNumber(),
    carbsG: row.carbsG.toNumber(),
    fatG: row.fatG.toNumber(),
  };
}

function requireDate(value: string): Date {
  const date = parseDateOnly(value);
  if (!date) throw new BadRequestException('Date is invalid.');
  return date;
}

@Injectable()
export class NutritionService {
  constructor(private readonly prisma: PrismaService) {}

  async getDay(userId: string, dateKey: string) {
    const eatenOn = requireDate(dateKey);
    const [rows, goal] = await Promise.all([
      this.prisma.client.foodEntry.findMany({
        where: { userId, eatenOn },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        select: entrySelect,
      }),
      this.getGoal(userId),
    ]);
    const entries = rows.map(toEntry);

    return {
      date: dateKey,
      goal,
      totals: sumMacros(entries),
      meals: groupByMeal(entries),
    };
  }

  async createEntry(userId: string, dto: CreateFoodEntryDto) {
    const eatenOn = requireDate(dto.eatenOn);

    const row = await this.prisma.client.$transaction(async (db) => {
      await this.requireRoomOnDay(db, userId, eatenOn, 1);
      const created = await db.foodEntry.create({
        data: {
          userId,
          eatenOn,
          meal: dto.meal,
          name: dto.name,
          servingLabel: dto.servingLabel ?? null,
          calories: dto.calories,
          proteinG: dto.proteinG ?? 0,
          carbsG: dto.carbsG ?? 0,
          fatG: dto.fatG ?? 0,
          note: dto.note ?? null,
        },
        select: entrySelect,
      });

      if (dto.saveAsFavorite) {
        await this.upsertFood(db, userId, {
          name: dto.name,
          servingLabel: dto.servingLabel,
          calories: dto.calories,
          proteinG: dto.proteinG,
          carbsG: dto.carbsG,
          fatG: dto.fatG,
        });
      }

      return created;
    });

    return toEntry(row);
  }

  /** Adds several foods to one meal in a single transaction. */
  async createEntries(userId: string, dto: BatchEntriesDto) {
    const eatenOn = requireDate(dto.eatenOn);

    const created = await this.prisma.client.$transaction(async (db) => {
      await this.requireRoomOnDay(db, userId, eatenOn, dto.items.length);
      const { count } = await db.foodEntry.createMany({
        data: dto.items.map((item) => ({
          userId,
          eatenOn,
          meal: dto.meal,
          name: item.name,
          servingLabel: item.servingLabel ?? null,
          calories: item.calories,
          proteinG: item.proteinG ?? 0,
          carbsG: item.carbsG ?? 0,
          fatG: item.fatG ?? 0,
        })),
      });
      return count;
    });

    return { created };
  }

  async updateEntry(userId: string, id: string, dto: UpdateFoodEntryDto) {
    const eatenOn = dto.eatenOn ? requireDate(dto.eatenOn) : undefined;

    const row = await this.prisma.client.$transaction(async (db) => {
      const existing = await db.foodEntry.findFirst({
        where: { id, userId },
        select: { id: true, eatenOn: true },
      });
      if (!existing) throw new NotFoundException('Food entry was not found.');

      if (eatenOn && toDateKey(eatenOn) !== toDateKey(existing.eatenOn)) {
        await this.requireRoomOnDay(db, userId, eatenOn, 1);
      }

      return db.foodEntry.update({
        where: { id },
        data: {
          eatenOn,
          meal: dto.meal,
          name: dto.name,
          servingLabel: dto.servingLabel,
          calories: dto.calories,
          proteinG: dto.proteinG,
          carbsG: dto.carbsG,
          fatG: dto.fatG,
          note: dto.note,
        },
        select: entrySelect,
      });
    });

    return toEntry(row);
  }

  async deleteEntry(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.client.foodEntry.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Food entry was not found.');
  }

  /** Copies a whole day, or one meal of it, onto another day. */
  async copyEntries(userId: string, dto: CopyEntriesDto) {
    const fromDate = requireDate(dto.fromDate);
    const toDate = requireDate(dto.toDate);
    if (toDateKey(fromDate) === toDateKey(toDate)) {
      throw new BadRequestException('Choose a different day to copy from.');
    }

    const copied = await this.prisma.client.$transaction(async (db) => {
      const source = await db.foodEntry.findMany({
        where: {
          userId,
          eatenOn: fromDate,
          ...(dto.meal ? { meal: dto.meal } : {}),
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      if (source.length === 0) {
        throw new NotFoundException('There are no entries to copy.');
      }

      await this.requireRoomOnDay(db, userId, toDate, source.length);
      await db.foodEntry.createMany({
        data: source.map((entry) => ({
          userId,
          eatenOn: toDate,
          meal: entry.meal,
          name: entry.name,
          servingLabel: entry.servingLabel,
          calories: entry.calories,
          proteinG: entry.proteinG,
          carbsG: entry.carbsG,
          fatG: entry.fatG,
          note: entry.note,
        })),
      });
      return source.length;
    });

    return { copied };
  }

  /** Daily totals for the trend chart; days without entries are omitted. */
  async getSummary(userId: string, toKey: string, days: number | undefined) {
    const to = requireDate(toKey);
    const length = clampSummaryDays(days);
    const from = shiftDate(to, length - 1);

    const [rows, goal] = await Promise.all([
      this.prisma.client.foodEntry.groupBy({
        by: ['eatenOn'],
        where: { userId, eatenOn: { gte: from, lte: to } },
        _sum: { calories: true, proteinG: true, carbsG: true, fatG: true },
        _count: { _all: true },
        orderBy: { eatenOn: 'asc' },
      }),
      this.getGoal(userId),
    ]);

    return {
      goal,
      from: toDateKey(from),
      to: toKey,
      days: rows.map((row) => ({
        date: toDateKey(row.eatenOn),
        calories: row._sum.calories ?? 0,
        proteinG: row._sum.proteinG?.toNumber() ?? 0,
        carbsG: row._sum.carbsG?.toNumber() ?? 0,
        fatG: row._sum.fatG?.toNumber() ?? 0,
        entryCount: row._count._all,
      })),
    };
  }

  async getGoal(userId: string) {
    const goal = await this.prisma.client.nutritionGoal.findUnique({
      where: { userId },
      select: { calories: true, proteinG: true, carbsG: true, fatG: true },
    });
    return goal;
  }

  async setGoal(userId: string, dto: NutritionGoalDto) {
    const values = {
      calories: dto.calories,
      proteinG: dto.proteinG ?? null,
      carbsG: dto.carbsG ?? null,
      fatG: dto.fatG ?? null,
    };
    return this.prisma.client.nutritionGoal.upsert({
      where: { userId },
      create: { userId, ...values },
      update: values,
      select: { calories: true, proteinG: true, carbsG: true, fatG: true },
    });
  }

  async clearGoal(userId: string): Promise<void> {
    await this.prisma.client.nutritionGoal.deleteMany({ where: { userId } });
  }

  /** Favorites, plus the foods the user logged most recently. */
  async listFoods(userId: string) {
    const [saved, recentRows] = await Promise.all([
      this.prisma.client.savedFood.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
        select: foodSelect,
      }),
      this.prisma.client.foodEntry.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 150,
        select: {
          name: true,
          servingLabel: true,
          calories: true,
          proteinG: true,
          carbsG: true,
          fatG: true,
        },
      }),
    ]);

    const seen = new Set<string>();
    const recent = [];
    for (const row of recentRows) {
      const key = row.name.toLocaleLowerCase('tr-TR');
      if (seen.has(key)) continue;
      seen.add(key);
      recent.push({
        name: row.name,
        servingLabel: row.servingLabel,
        calories: row.calories,
        proteinG: row.proteinG.toNumber(),
        carbsG: row.carbsG.toNumber(),
        fatG: row.fatG.toNumber(),
      });
      if (recent.length === 12) break;
    }

    return { saved: saved.map(toFood), recent };
  }

  /** Foods from the built-in catalog (USDA data with Turkish names). */
  searchCatalog(query: string): CatalogFood[] {
    return searchCatalog(query);
  }

  /** Packaged products from Open Food Facts; can fail when that service is down. */
  async searchPackaged(query: string): Promise<CatalogFood[]> {
    try {
      return await searchPackagedFoods(query);
    } catch (error) {
      if (error instanceof PackagedFoodsUnavailableError) {
        throw new ServiceUnavailableException(
          'Packaged food search is unavailable.',
        );
      }
      throw error;
    }
  }

  async saveFood(userId: string, dto: SavedFoodDto) {
    const row = await this.prisma.client.$transaction((db) =>
      this.upsertFood(db, userId, dto),
    );
    return toFood(row);
  }

  async deleteFood(userId: string, id: string): Promise<void> {
    const { count } = await this.prisma.client.savedFood.deleteMany({
      where: { id, userId },
    });
    if (count === 0) throw new NotFoundException('Saved food was not found.');
  }

  private async upsertFood(
    db: Prisma.TransactionClient,
    userId: string,
    food: SavedFoodDto,
  ) {
    const existing = await db.savedFood.findUnique({
      where: { userId_name: { userId, name: food.name } },
      select: { id: true },
    });
    if (!existing) {
      const total = await db.savedFood.count({ where: { userId } });
      if (total >= MAX_SAVED_FOODS) {
        throw new BadRequestException('The favorites list is full.');
      }
    }

    const values = {
      servingLabel: food.servingLabel ?? null,
      calories: food.calories,
      proteinG: food.proteinG ?? 0,
      carbsG: food.carbsG ?? 0,
      fatG: food.fatG ?? 0,
    };
    return db.savedFood.upsert({
      where: { userId_name: { userId, name: food.name } },
      create: { userId, name: food.name, ...values },
      update: values,
      select: foodSelect,
    });
  }

  private async requireRoomOnDay(
    db: Prisma.TransactionClient,
    userId: string,
    eatenOn: Date,
    adding: number,
  ): Promise<void> {
    const count = await db.foodEntry.count({ where: { userId, eatenOn } });
    if (count + adding > MAX_ENTRIES_PER_DAY) {
      throw new BadRequestException(
        `A day can hold at most ${MAX_ENTRIES_PER_DAY} entries.`,
      );
    }
  }
}
