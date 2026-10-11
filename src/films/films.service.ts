import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithId } from '../common/schema-validators';
import { Showing } from '../showings/schemas/showing.schema';
import { CreateFilmInput } from './dto/create-film.input';
import { UpdateFilmInput } from './dto/update-film.input';
import { Film } from './schemas/film.schema';

@Injectable()
export class FilmsService {
  constructor(
    @InjectModel(Film.name) private readonly filmModel: Model<Film>,
    @InjectModel(Showing.name) private readonly showingModel: Model<Showing>,
  ) {}

  async create(input: CreateFilmInput): Promise<WithId<Film>> {
    const film = await this.filmModel.create({
      title: input.title,
      durationMinutes: input.durationMinutes,
      releaseYear: input.releaseYear,
    });
    return film.toObject();
  }

  findAll(): Promise<WithId<Film>[]> {
    return this.filmModel
      .find()
      .sort({ title: 1, _id: 1 })
      .lean<WithId<Film>[]>();
  }

  /** The film or null (used by the `film(id)` query and by other modules). */
  findById(id: string): Promise<WithId<Film> | null> {
    return this.filmModel.findById(id).lean<WithId<Film>>();
  }

  /** Only the fields present in the input are changed ($set), in one query. */
  async update(id: string, input: UpdateFilmInput): Promise<WithId<Film>> {
    const changes: Partial<Film> = {};
    if (input.title !== undefined) changes.title = input.title;
    if (input.durationMinutes !== undefined) {
      changes.durationMinutes = input.durationMinutes;
    }
    if (input.releaseYear !== undefined)
      changes.releaseYear = input.releaseYear;

    const film = await this.filmModel
      .findByIdAndUpdate(
        id,
        { $set: changes },
        { new: true, runValidators: true },
      )
      .lean<WithId<Film>>();
    if (!film) {
      throw this.notFound(id);
    }
    return film;
  }

  /**
   * MongoDB has no foreign keys, so the service itself checks that no showing
   * references the film (CONFLICT) before deleting it.
   */
  async remove(id: string): Promise<boolean> {
    const film = await this.findById(id);
    if (!film) {
      throw this.notFound(id); // NOT_FOUND
    }
    const referenced = await this.showingModel.exists({ film: id });
    if (referenced) {
      throw new ConflictException(
        `Film with id ${id} cannot be deleted because it has showings`,
      );
    }
    const result = await this.filmModel.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw this.notFound(id); // deleted by a parallel request
    }
    return true;
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Film with id ${id} not found`);
  }
}
