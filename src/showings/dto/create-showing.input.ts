import { Field, GraphQLISODateTime, ID, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsInt, IsMongoId, Max, Min } from 'class-validator';
import { MAX_PRICE_KOPECKS } from '../../common/limits';
import { objectIdMessage } from '../../common/object-id';

/**
 * `CreateShowingInput`. The referenced film and hall must exist (checked in
 * the service -> NOT_FOUND). `startsAt` is a `DateTime!` parsed into a Date;
 * the "must be in the future" rule is applied in the service.
 */
@InputType()
export class CreateShowingInput {
  @Field(() => ID)
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId: string;

  @Field(() => ID)
  @IsMongoId({ message: objectIdMessage('hallId') })
  hallId: string;

  @Field(() => GraphQLISODateTime)
  @IsDate({ message: 'startsAt must be a valid date-time' })
  startsAt: Date;

  @Field(() => Int, {
    description: 'Price per seat in kopecks (positive integer)',
  })
  @Max(MAX_PRICE_KOPECKS, {
    message: `price must not exceed ${MAX_PRICE_KOPECKS} kopecks`,
  })
  @Min(1, { message: 'price must be a positive integer (kopecks)' })
  @IsInt({ message: 'price must be an integer number of kopecks' })
  price: number;
}
