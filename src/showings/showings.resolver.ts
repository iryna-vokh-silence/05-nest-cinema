import {
  Args,
  Context,
  ID,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { GraphqlContext } from '../common/loaders/graphql-context';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { FilmType } from '../films/models/film.model';
import { HallType } from '../halls/models/hall.model';
import { CreateShowingInput } from './dto/create-showing.input';
import { ShowingsArgs } from './dto/showings.args';
import { ShowingPageType } from './models/showing-page.model';
import { ShowingType } from './models/showing.model';
import { ShowingsService } from './showings.service';

@Resolver(() => ShowingType)
export class ShowingsResolver {
  constructor(private readonly showingsService: ShowingsService) {}

  @Query(() => ShowingPageType, { name: 'showings' })
  showings(@Args() args: ShowingsArgs): Promise<ShowingPageType> {
    return this.showingsService.findPage(args);
  }

  /** Returns the showing or null; a malformed id gives BAD_USER_INPUT (pipe). */
  @Query(() => ShowingType, { name: 'showing', nullable: true })
  showing(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<ShowingType | null> {
    return this.showingsService.findById(id);
  }

  @Mutation(() => ShowingType)
  createShowing(
    @Args('input') input: CreateShowingInput,
  ): Promise<ShowingType> {
    return this.showingsService.create(input);
  }

  /**
   * Field resolver for `Showing.film`. It does not query the database itself:
   * it hands the film id to the per-request DataLoader, which collects all the
   * ids of the current request and reads them with a single batched query.
   * This is what keeps a page of showings from triggering one film query each
   * (the N+1 problem).
   */
  @ResolveField(() => FilmType, { name: 'film' })
  film(
    @Parent() showing: ShowingType,
    @Context() ctx: GraphqlContext,
  ): Promise<FilmType> {
    return ctx.loaders.film.load(showing.filmId.toString());
  }

  @ResolveField(() => HallType, { name: 'hall' })
  hall(
    @Parent() showing: ShowingType,
    @Context() ctx: GraphqlContext,
  ): Promise<HallType> {
    return ctx.loaders.hall.load(showing.hallId.toString());
  }
}
