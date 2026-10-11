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
  MAX_HALL_NAME_LENGTH,
  MAX_ROWS,
  MAX_SEATS_PER_ROW,
} from '../../common/limits';
import { Trim } from '../../common/transforms/trim.transform';

/** `CreateHallInput`. The name is unique case-insensitively (checked in the service). */
@InputType()
export class CreateHallInput {
  @Field()
  @MaxLength(MAX_HALL_NAME_LENGTH)
  @IsNotEmpty()
  @IsString()
  @Trim()
  name: string;

  @Field(() => Int)
  @Max(MAX_ROWS)
  @Min(1)
  @IsInt()
  rows: number;

  @Field(() => Int)
  @Max(MAX_SEATS_PER_ROW)
  @Min(1)
  @IsInt()
  seatsPerRow: number;
}
