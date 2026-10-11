import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ShowingType } from './showing.model';

/** GraphQL type `ShowingPage`: one page of the paginated showings query. */
@ObjectType('ShowingPage')
export class ShowingPageType {
  @Field(() => [ShowingType])
  items: ShowingType[];

  /** Number of showings that match the filters across all pages. */
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
