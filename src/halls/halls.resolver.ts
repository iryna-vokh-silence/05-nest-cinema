import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateHallInput } from './dto/create-hall.input';
import { HallsService } from './halls.service';
import { HallType } from './models/hall.model';

@Resolver(() => HallType)
export class HallsResolver {
  constructor(private readonly hallsService: HallsService) {}

  @Query(() => [HallType], { name: 'halls' })
  halls(): Promise<HallType[]> {
    return this.hallsService.findAll();
  }

  /** Returns the hall or null; a malformed id gives BAD_USER_INPUT (pipe). */
  @Query(() => HallType, { name: 'hall', nullable: true })
  hall(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<HallType | null> {
    return this.hallsService.findById(id);
  }

  @Mutation(() => HallType)
  createHall(@Args('input') input: CreateHallInput): Promise<HallType> {
    return this.hallsService.create(input);
  }

  @Mutation(() => Boolean)
  deleteHall(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<boolean> {
    return this.hallsService.remove(id);
  }
}
