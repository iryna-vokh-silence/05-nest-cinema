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
import { IsDefinedIfPresent } from '../../common/validators/is-defined-if-present.decorator';

/**
 * `UpdateFilmInput`: every field is optional. An absent field is left
 * unchanged; a field that IS present is validated (so `null`, which GraphQL
 * allows for a nullable input field, is rejected rather than wiping a value).
 */
@InputType()
export class UpdateFilmInput {
  @Field({ nullable: true })
  @MaxLength(MAX_TITLE_LENGTH)
  @IsNotEmpty()
  @IsString()
  @IsDefinedIfPresent()
  @Trim()
  title?: string;

  @Field(() => Int, { nullable: true })
  @Max(MAX_DURATION_MINUTES)
  @Min(1)
  @IsInt()
  @IsDefinedIfPresent()
  durationMinutes?: number;

  @Field(() => Int, { nullable: true })
  @Max(MAX_RELEASE_YEAR)
  @Min(MIN_RELEASE_YEAR)
  @IsInt()
  @IsDefinedIfPresent()
  releaseYear?: number;
}
