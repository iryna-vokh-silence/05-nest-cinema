import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import DataLoader from 'dataloader';
import { Model } from 'mongoose';
import { Film } from '../../films/schemas/film.schema';
import { Hall } from '../../halls/schemas/hall.schema';
import { WithId } from '../schema-validators';

export type FilmLoader = DataLoader<string, WithId<Film>>;
export type HallLoader = DataLoader<string, WithId<Hall>>;

/** The per-request loaders carried in the GraphQL context. */
export interface Loaders {
  film: FilmLoader;
  hall: HallLoader;
}

/**
 * Builds the DataLoaders that the field resolvers of `Showing` use to read
 * the referenced `film` and `hall`.
 *
 * The factory itself is a singleton (it holds the models), but `create()`
 * returns FRESH loaders for every request: a loader batches the ids collected
 * during one GraphQL request into a single `find({ _id: { $in } })`, and is
 * thrown away afterwards so nothing is cached between requests of different
 * clients.
 */
@Injectable()
export class LoadersFactory {
  constructor(
    @InjectModel(Film.name) private readonly filmModel: Model<Film>,
    @InjectModel(Hall.name) private readonly hallModel: Model<Hall>,
  ) {}

  create(): Loaders {
    return {
      film: new DataLoader<string, WithId<Film>>((ids) =>
        this.loadByIds(this.filmModel, ids),
      ),
      hall: new DataLoader<string, WithId<Hall>>((ids) =>
        this.loadByIds(this.hallModel, ids),
      ),
    };
  }

  /**
   * One query per batch of ids. The result of `find` comes back in an
   * arbitrary order, so it is indexed by id and re-emitted in the exact order
   * DataLoader asked for (its contract). A missing document becomes an Error
   * for that key instead of silently shifting the array.
   */
  private async loadByIds<T>(
    model: Model<T>,
    ids: readonly string[],
  ): Promise<(WithId<T> | Error)[]> {
    const docs = await model
      .find({ _id: { $in: ids as string[] } })
      .lean<WithId<T>[]>();
    const byId = new Map(docs.map((doc) => [doc._id.toString(), doc]));
    return ids.map(
      (id) => byId.get(id) ?? new Error(`Document with id ${id} not found`),
    );
  }
}
