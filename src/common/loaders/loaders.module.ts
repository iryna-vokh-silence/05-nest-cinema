import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Film, FilmSchema } from '../../films/schemas/film.schema';
import { Hall, HallSchema } from '../../halls/schemas/hall.schema';
import { LoadersFactory } from './loaders.factory';

/**
 * Provides the {@link LoadersFactory}. Imported by the GraphQL configuration
 * so that `context` can mint a fresh set of loaders per request.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Film.name, schema: FilmSchema },
      { name: Hall.name, schema: HallSchema },
    ]),
  ],
  providers: [LoadersFactory],
  exports: [LoadersFactory],
})
export class LoadersModule {}
