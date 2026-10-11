import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { Types } from 'mongoose';

/**
 * GraphQL type `Film`. The MongoDB `_id` is exposed as the string field `id`
 * (the `ID` scalar serializes an ObjectId through `toString`), so the schema
 * never shows `_id`.
 */
@ObjectType('Film')
export class FilmType {
  @Field(() => ID, { name: 'id' })
  _id: Types.ObjectId;

  @Field()
  title: string;

  @Field(() => Int)
  durationMinutes: number;

  @Field(() => Int)
  releaseYear: number;
}
