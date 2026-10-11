import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { Types } from 'mongoose';
import { BookingType } from './booking.model';
import { SeatType } from './seat.model';

/**
 * GraphQL type `Showing`.
 *
 * `film` and `hall` are object fields (`Film!` / `Hall!`), NOT ids: they are
 * added by field resolvers in {@link ShowingsResolver} so a client can ask for
 * the film title nested inside a showing. The raw reference ids stay on the
 * object (`filmId`/`hallId`) for those resolvers; they are not part of the
 * schema.
 */
@ObjectType('Showing')
export class ShowingType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field(() => GraphQLISODateTime)
  startsAt: Date;

  @Field(() => Int)
  price: number;

  @Field(() => [SeatType])
  seats: SeatType[];

  @Field(() => [BookingType])
  bookings: BookingType[];

  /** Reference ids kept for the `film`/`hall` field resolvers (not exposed). */
  filmId: Types.ObjectId;
  hallId: Types.ObjectId;
}
