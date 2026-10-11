import { registerEnumType } from '@nestjs/graphql';

/** Sort direction for the showings query. The values double as the Mongo sort sign. */
export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Order of showings by start time',
});
