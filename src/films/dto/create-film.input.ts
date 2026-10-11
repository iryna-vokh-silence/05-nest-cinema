import { Field, InputType, Int } from '@nestjs/graphql';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  MAX_DURATION_MINUTES,
  MAX_RELEASE_YEAR,
  MAX_TITLE_LENGTH,
  MIN_RELEASE_YEAR,
} from '../../common/limits';
import { Trim } from '../../common/transforms/trim.transform';

/**
 * `CreateFilmInput`. The `Int!` scalars already guarantee presence and an
 * integer; class-validator adds the value ranges (and trims/non-empties the
 * title). Decorators run bottom-up and stop at the first failure.
 */
@InputType()
export class CreateFilmInput {
  @Field()
  @MaxLength(MAX_TITLE_LENGTH)
  @IsNotEmpty()
  @IsString()
  @Trim()
  title: string;

  @Field(() => Int)
  @Max(MAX_DURATION_MINUTES)
  @Min(1)
  @IsInt()
  durationMinutes: number;

  @Field(() => Int)
  @Max(MAX_RELEASE_YEAR)
  @Min(MIN_RELEASE_YEAR)
  @IsInt()
  releaseYear: number;
}
