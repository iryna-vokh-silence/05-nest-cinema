import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { SeatInput } from '../showings/dto/seat.input';
import { BookingType } from '../showings/models/booking.model';
import { BookingsService } from './bookings.service';

@Resolver(() => BookingType)
export class BookingsResolver {
  constructor(private readonly bookingsService: BookingsService) {}

  @Query(() => [BookingType], { name: 'bookings' })
  bookings(): Promise<BookingType[]> {
    return this.bookingsService.findAll();
  }

  @Mutation(() => BookingType)
  createBooking(
    @Args('showingId', { type: () => ID }, ParseObjectIdPipe) showingId: string,
    @Args({ name: 'seats', type: () => [SeatInput] }) seats: SeatInput[],
  ): Promise<BookingType> {
    return this.bookingsService.create(showingId, seats);
  }

  @Mutation(() => Boolean)
  cancelBooking(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<boolean> {
    return this.bookingsService.remove(id);
  }
}
