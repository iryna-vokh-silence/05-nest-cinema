import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isDuplicateKeyError } from '../common/mongo-errors';
import { WithId } from '../common/schema-validators';
import { Showing } from '../showings/schemas/showing.schema';
import { CreateHallInput } from './dto/create-hall.input';
import { Hall, HALL_NAME_COLLATION } from './schemas/hall.schema';

@Injectable()
export class HallsService implements OnModuleInit {
  constructor(
    @InjectModel(Hall.name) private readonly hallModel: Model<Hall>,
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
  ) {}

  /** Builds the unique index on the hall name before the first request. */
  async onModuleInit(): Promise<void> {
    await this.hallModel.init();
  }

  /**
   * Names are unique case-insensitively. The service checks first (with the
   * collation of the index) for a friendly CONFLICT; the unique index
   * UQ_halls_name still catches the race when two equal names arrive at once.
   */
  async create(input: CreateHallInput): Promise<WithId<Hall>> {
    const name = input.name.trim();
    const exists = await this.hallModel
      .exists({ name })
      .collation(HALL_NAME_COLLATION);
    if (exists) {
      throw this.duplicateName(name);
    }
    try {
      const hall = await this.hallModel.create({
        name,
        rows: input.rows,
        seatsPerRow: input.seatsPerRow,
      });
      return hall.toObject();
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw this.duplicateName(name);
      }
      throw error;
    }
  }

  findAll(): Promise<WithId<Hall>[]> {
    return this.hallModel
      .find()
      .sort({ name: 1, _id: 1 })
      .lean<WithId<Hall>[]>();
  }

  /** The hall or null (used by the `hall(id)` query and by other modules). */
  findById(id: string): Promise<WithId<Hall> | null> {
    return this.hallModel.findById(id).lean<WithId<Hall>>();
  }

  /**
   * No foreign keys in MongoDB: the service checks that no showing references
   * the hall (CONFLICT) before deleting it.
   */
  async remove(id: string): Promise<boolean> {
    const hall = await this.findById(id);
    if (!hall) {
      throw this.notFound(id);
    }
    const referenced = await this.showingModel.exists({ hall: id });
    if (referenced) {
      throw new ConflictException(
        `Hall with id ${id} cannot be deleted because it has showings`,
      );
    }
    const result = await this.hallModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw this.notFound(id);
    }
    return true;
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Hall with id ${id} not found`);
  }

  private duplicateName(name: string): ConflictException {
    return new ConflictException(`Hall with name "${name}" already exists`);
  }
}
