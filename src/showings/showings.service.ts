import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { WithId } from '../common/schema-validators';
import { FilmsService } from '../films/films.service';
import { computeSeats } from '../halls/hall-seats';
import { HallsService } from '../halls/halls.service';
import { CreateShowingInput } from './dto/create-showing.input';
import { ShowingsArgs } from './dto/showings.args';
import { SortOrder } from './models/sort-order.enum';
import { Showing } from './schemas/showing.schema';
import { ShowingSeat } from './schemas/showing-seat.schema';
import { ShowingView, toShowingView } from './showing-view';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ShowingPageResult {
  items: ShowingView[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ShowingsService implements OnModuleInit {
  constructor(
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
    private readonly filmsService: FilmsService,
    private readonly hallsService: HallsService,
  ) {}

  /** Builds the indexes of the showings collection before serving requests. */
  async onModuleInit(): Promise<void> {
    await this.showingModel.init();
  }

  /**
   * Creates the showing together with its seat map: the hall's rows ×
   * seatsPerRow are expanded into `seats` (every bookingId = null) and
   * `bookings` starts empty. A missing film or hall is NOT_FOUND; a start
   * time in the past (or a non-positive price, caught by validation) is
   * BAD_USER_INPUT.
   */
  async create(input: CreateShowingInput): Promise<ShowingView> {
    const film = await this.filmsService.findById(input.filmId);
    if (!film) {
      throw new NotFoundException(`Film with id ${input.filmId} not found`);
    }
    const hall = await this.hallsService.findById(input.hallId);
    if (!hall) {
      throw new NotFoundException(`Hall with id ${input.hallId} not found`);
    }
    const startsAt = new Date(input.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('startsAt must be a valid date-time');
    }
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('startsAt must be in the future');
    }

    const seats: ShowingSeat[] = computeSeats(hall).map((s) => ({
      row: s.row,
      seat: s.seat,
      bookingId: null,
    }));
    const showing = await this.showingModel.create({
      film: film._id,
      hall: hall._id,
      startsAt,
      price: input.price,
      seats,
      bookings: [],
    });

    return toShowingView(showing.toObject());
  }

  /**
   * One page of showings. Filtering, sorting and paging are done by MongoDB.
   * Filters combine with AND; order: startsAt (ASC|DESC), then _id.
   *
   * No populate(): the `film`/`hall` of each showing are resolved by the field
   * resolvers through a per-request DataLoader, so the whole page costs one
   * find() here plus one batched query per referenced collection — not one
   * query per showing (see README, "N+1").
   */
  async findPage(args: ShowingsArgs): Promise<ShowingPageResult> {
    const { filmId, date, page, limit, sort } = args;

    const filter: FilterQuery<Showing> = {};
    if (filmId) {
      filter.film = new Types.ObjectId(filmId);
    }
    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(dayStart.getTime() + DAY_MS);
      filter.startsAt = { $gte: dayStart, $lt: dayEnd };
    }

    const [showings, total] = await Promise.all([
      this.showingModel
        .find(filter)
        .sort({ startsAt: sort === SortOrder.DESC ? -1 : 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<WithId<Showing>[]>(),
      this.showingModel.countDocuments(filter),
    ]);

    return {
      items: showings.map((s) => toShowingView(s)),
      total,
      page,
      limit,
    };
  }

  /** The showing or null (the `showing(id)` query). */
  async findById(id: string): Promise<ShowingView | null> {
    const showing = await this.showingModel
      .findById(id)
      .lean<WithId<Showing>>();
    return showing ? toShowingView(showing) : null;
  }
}
