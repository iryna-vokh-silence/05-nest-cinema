import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

/** `SeatInput`: a seat position to book (both numbers are 1-based). */
@InputType()
export class SeatInput {
  @Field(() => Int)
  @Min(1)
  @IsInt()
  row: number;

  @Field(() => Int)
  @Min(1)
  @IsInt()
  seat: number;
}
