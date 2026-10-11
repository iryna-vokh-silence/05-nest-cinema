import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Showing, ShowingSchema } from '../showings/schemas/showing.schema';
import { FilmsResolver } from './films.resolver';
import { FilmsService } from './films.service';
import { Film, FilmSchema } from './schemas/film.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Film.name, schema: FilmSchema },
      // Read-only use: "does any showing reference this film?" before delete.
      { name: Showing.name, schema: ShowingSchema },
    ]),
  ],
  providers: [FilmsResolver, FilmsService],
  exports: [FilmsService],
})
export class FilmsModule {}
