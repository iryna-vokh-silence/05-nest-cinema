import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Showing, ShowingSchema } from '../showings/schemas/showing.schema';
import { BookingsResolver } from './bookings.resolver';
import { BookingsService } from './bookings.service';

/**
 * Bookings have no collection of their own: they live in `showings.bookings`,
 * so this module works with the Showing model.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Showing.name, schema: ShowingSchema }]),
  ],
  providers: [BookingsResolver, BookingsService],
})
export class BookingsModule {}
