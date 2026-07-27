import { Request, Response } from 'express';
import { HouseholdStatsService, type StatsRangesInput } from '../services/HouseholdStatsService';
import { BadRequestError, NotFoundError, ValidationError } from '../errors/CustomErrors';

// Sanity bound on the timezone offset the client reports (minutes, UTC-14..+14).
const MAX_TZ_OFFSET_MINUTES = 14 * 60;

export class HouseholdStatsController {
  private service: HouseholdStatsService;

  constructor() {
    this.service = new HouseholdStatsService();
  }

  async getStats(req: Request, res: Response): Promise<void> {
    await this.handle(req, res, (householdId, ranges) => this.service.getStats(householdId, ranges));
  }

  async getSummary(req: Request, res: Response): Promise<void> {
    await this.handle(req, res, (householdId, ranges) =>
      this.service.getSummary(householdId, ranges)
    );
  }

  private async handle<T>(
    req: Request,
    res: Response,
    run: (householdId: string, ranges: StatsRangesInput) => Promise<T>
  ): Promise<void> {
    try {
      const { householdId } = req.params;
      const user = (req as any).user;
      if (!user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }
      if (!householdId) {
        res.status(400).json({ success: false, error: 'Household ID is required' });
        return;
      }

      const ranges = this.parseRanges(req);
      if (!ranges) {
        res.status(400).json({ success: false, error: 'Invalid date range parameters' });
        return;
      }

      const data = await run(householdId, ranges);
      res.status(200).json({ success: true, data });
    } catch (error) {
      const status =
        error instanceof NotFoundError
          ? 404
          : error instanceof ValidationError || error instanceof BadRequestError
            ? 400
            : 500;
      if (status === 500) console.error('Error in household stats:', error);
      res.status(status).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    }
  }

  /**
   * The frontend owns period semantics (same convention as the exit journal)
   * and passes explicit ISO bounds plus its timezone offset, which the service
   * needs to bucket the trend series by calendar month.
   */
  private parseRanges(req: Request): StatsRangesInput | null {
    const parseDate = (value: unknown): Date | undefined | null => {
      if (value === undefined || value === '') return undefined;
      if (typeof value !== 'string') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const from = parseDate(req.query.from);
    const to = parseDate(req.query.to);
    const previousFrom = parseDate(req.query.previousFrom);
    const previousTo = parseDate(req.query.previousTo);
    const trendFrom = parseDate(req.query.trendFrom);
    const trendTo = parseDate(req.query.trendTo);

    if ([from, to, previousFrom, previousTo, trendFrom, trendTo].some((d) => d === null)) {
      return null;
    }

    const rawOffset = Number(req.query.tzOffset);
    const tzOffsetMinutes =
      Number.isFinite(rawOffset) && Math.abs(rawOffset) <= MAX_TZ_OFFSET_MINUTES ? rawOffset : 0;

    return {
      from: from ?? undefined,
      to: to ?? undefined,
      previousFrom: previousFrom ?? undefined,
      previousTo: previousTo ?? undefined,
      trendFrom: trendFrom ?? undefined,
      trendTo: trendTo ?? undefined,
      tzOffsetMinutes,
    };
  }
}
