import { Field, Int, ObjectType } from '@nestjs/graphql';

/**
 * GraphQL type `Seat`: a hall seat together with its occupancy on one
 * showing. `isBooked` is derived from the stored `bookingId` (a seat is free
 * while its bookingId is null).
 */
@ObjectType('Seat')
export class SeatType {
  @Field(() => Int)
  row: number;

  @Field(() => Int)
  seat: number;

  @Field()
  isBooked: boolean;
}

/**
 * GraphQL type `BookedSeat`: a seat position stored inside a booking. The
 * embedded booking keeps only the coordinates, so — unlike `Seat` — it has no
 * `isBooked` field.
 */
@ObjectType('BookedSeat')
export class BookedSeatType {
  @Field(() => Int)
  row: number;

  @Field(() => Int)
  seat: number;
}
