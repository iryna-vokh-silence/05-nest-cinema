import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';
import { CreateFilmInput } from './dto/create-film.input';
import { UpdateFilmInput } from './dto/update-film.input';
import { FilmsService } from './films.service';
import { FilmType } from './models/film.model';

@Resolver(() => FilmType)
export class FilmsResolver {
  constructor(private readonly filmsService: FilmsService) {}

  @Query(() => [FilmType], { name: 'films' })
  films(): Promise<FilmType[]> {
    return this.filmsService.findAll();
  }

  /** Returns the film or null; a malformed id gives BAD_USER_INPUT (pipe). */
  @Query(() => FilmType, { name: 'film', nullable: true })
  film(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<FilmType | null> {
    return this.filmsService.findById(id);
  }

  @Mutation(() => FilmType)
  createFilm(@Args('input') input: CreateFilmInput): Promise<FilmType> {
    return this.filmsService.create(input);
  }

  @Mutation(() => FilmType)
  updateFilm(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
    @Args('input') input: UpdateFilmInput,
  ): Promise<FilmType> {
    return this.filmsService.update(id, input);
  }

  @Mutation(() => Boolean)
  deleteFilm(
    @Args('id', { type: () => ID }, ParseObjectIdPipe) id: string,
  ): Promise<boolean> {
    return this.filmsService.remove(id);
  }
}
