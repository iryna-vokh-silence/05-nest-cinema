import {
  Field,
  GraphQLISODateTime,
  ID,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import { Types } from 'mongoose';
import { BookedSeatType } from './seat.model';

/**
 * GraphQL type `Booking`. A booking lives inside the document of its showing,
 * so `showingId` is the `_id` of that showing document.
 */
@ObjectType('Booking')
export class BookingType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field(() => ID)
  showingId: Types.ObjectId;

  @Field(() => [BookedSeatType])
  seats: BookedSeatType[];

  @Field(() => Int)
  totalPrice: number;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;
}
