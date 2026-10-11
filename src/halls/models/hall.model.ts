import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';

/**
 * GraphQL type `Hall`. There is deliberately no `seats` field here: the seat
 * list of a hall only has meaning together with a showing, so occupancy is
 * exposed through `Showing.seats` instead.
 */
@ObjectType('Hall')
export class HallType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field()
  name: string;

  @Field(() => Int)
  rows: number;

  @Field(() => Int)
  seatsPerRow: number;
}
