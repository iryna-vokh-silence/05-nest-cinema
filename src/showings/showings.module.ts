import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FilmsModule } from '../films/films.module';
import { HallsModule } from '../halls/halls.module';
import { Showing, ShowingSchema } from './schemas/showing.schema';
import { ShowingsResolver } from './showings.resolver';
import { ShowingsService } from './showings.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showing.name, schema: ShowingSchema }]),
    FilmsModule,
    HallsModule,
  ],
  providers: [ShowingsResolver, ShowingsService],
  exports: [ShowingsService],
})
export class ShowingsModule {}
