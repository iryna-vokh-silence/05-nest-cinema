import { ArgsType, Field, ID, Int } from '@nestjs/graphql';
import {
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { objectIdMessage } from '../../common/object-id';
import {
  CALENDAR_DATE_REGEX,
  IsCalendarDate,
} from '../../common/validators/is-calendar-date.decorator';
import { SortOrder } from '../models/sort-order.enum';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Arguments of the `showings` query, gathered into one `@ArgsType` class
 * (not separate scalar arguments). All fields are optional and have defaults.
 */
@ArgsType()
export class ShowingsArgs {
  @Field(() => ID, {
    nullable: true,
    description: 'Only showings of this film',
  })
  @IsOptional()
  @IsMongoId({ message: objectIdMessage('filmId') })
  filmId?: string;

  @Field(() => String, {
    nullable: true,
    description: 'Only showings starting on this day (YYYY-MM-DD, UTC)',
  })
  @IsOptional()
  @IsCalendarDate()
  @Matches(CALENDAR_DATE_REGEX, { message: 'date must match YYYY-MM-DD' })
  date?: string;

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_PAGE })
  @IsOptional()
  @Min(1)
  @IsInt()
  page: number = DEFAULT_PAGE;

  @Field(() => Int, { nullable: true, defaultValue: DEFAULT_LIMIT })
  @IsOptional()
  @Max(MAX_LIMIT)
  @Min(1)
  @IsInt()
  limit: number = DEFAULT_LIMIT;

  @Field(() => SortOrder, { nullable: true, defaultValue: SortOrder.ASC })
  @IsOptional()
  @IsEnum(SortOrder)
  sort: SortOrder = SortOrder.ASC;
}
