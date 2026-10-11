import { INestApplication } from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Connection, Model } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { configureApp } from '../src/app.setup';
import { AppModule } from '../src/app.module';
import { Film } from '../src/films/schemas/film.schema';
import { Hall } from '../src/halls/schemas/hall.schema';
import { clearAll } from './db-utils';

/** Valid ObjectId format, but no document has it. */
const MISSING_ID = '000000000000000000000000';
const BAD_ID = 'not-an-object-id';
const OBJECT_ID = /^[0-9a-f]{24}$/;
const FUTURE = '2030-01-15T18:00:00.000Z';
const PAST = '2020-01-01T10:00:00.000Z';

/** An `expect` matcher for any ObjectId string, typed so toEqual accepts it. */
const anyObjectId = expect.stringMatching(OBJECT_ID) as unknown as string;

interface GqlResponse<T = Record<string, unknown>> {
  data: T | null;
  errors?: { message: string; extensions?: { code?: string } }[];
}

async function createApp(): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.listen(0);
  return app;
}

describe('Cinema GraphQL API (e2e, MongoDB)', () => {
  let app: INestApplication<App>;
  let http: App;
  let db: Connection;
  let filmModel: Model<Film>;
  let hallModel: Model<Hall>;

  beforeAll(async () => {
    app = await createApp();
    http = app.getHttpServer();
    db = app.get<Connection>(getConnectionToken());
    filmModel = app.get<Model<Film>>(getModelToken(Film.name));
    hallModel = app.get<Model<Hall>>(getModelToken(Hall.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearAll(db);
  });

  /** Runs one GraphQL operation and returns the raw { data, errors } body. */
  async function gql<T = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<GqlResponse<T>> {
    const res = await request(http)
      .post('/graphql')
      .send({ query, variables })
      .set('content-type', 'application/json');
    return res.body as GqlResponse<T>;
  }

  function codeOf(body: GqlResponse): string | undefined {
    return body.errors?.[0]?.extensions?.code;
  }

  // Convenience builders used by many tests.
  async function makeFilm(
    title = 'Interstellar',
    durationMinutes = 169,
    releaseYear = 2014,
  ): Promise<string> {
    const body = await gql<{ createFilm: { id: string } }>(
      `mutation($i: CreateFilmInput!){ createFilm(input:$i){ id } }`,
      { i: { title, durationMinutes, releaseYear } },
    );
    return body.data!.createFilm.id;
  }

  async function makeHall(
    name = 'Red Hall',
    rows = 3,
    seatsPerRow = 5,
  ): Promise<string> {
    const body = await gql<{ createHall: { id: string } }>(
      `mutation($i: CreateHallInput!){ createHall(input:$i){ id } }`,
      { i: { name, rows, seatsPerRow } },
    );
    return body.data!.createHall.id;
  }

  async function makeShowing(
    filmId: string,
    hallId: string,
    startsAt = FUTURE,
    price = 15000,
  ): Promise<string> {
    const body = await gql<{ createShowing: { id: string } }>(
      `mutation($i: CreateShowingInput!){ createShowing(input:$i){ id } }`,
      { i: { filmId, hallId, startsAt, price } },
    );
    return body.data!.createShowing.id;
  }

  // ---------------------------------------------------------------- Films ---
  describe('Films', () => {
    it('createFilm returns the film with a string id', async () => {
      const body = await gql<{ createFilm: Record<string, unknown> }>(
        `mutation($i: CreateFilmInput!){ createFilm(input:$i){ id title durationMinutes releaseYear } }`,
        { i: { title: 'Dune', durationMinutes: 166, releaseYear: 2021 } },
      );
      expect(body.errors).toBeUndefined();
      expect(body.data!.createFilm).toEqual({
        id: anyObjectId,
        title: 'Dune',
        durationMinutes: 166,
        releaseYear: 2021,
      });
    });

    it('films returns all films sorted by title', async () => {
      await makeFilm('Zodiac', 157, 2007);
      await makeFilm('Arrival', 116, 2016);
      const body = await gql<{ films: { title: string }[] }>(
        `{ films { title } }`,
      );
      expect(body.data!.films.map((f) => f.title)).toEqual([
        'Arrival',
        'Zodiac',
      ]);
    });

    it('film(id) returns the film; a missing id returns null (no error)', async () => {
      const id = await makeFilm();
      const found = await gql<{ film: { title: string } | null }>(
        `query($id: ID!){ film(id:$id){ title } }`,
        { id },
      );
      expect(found.data!.film).toEqual({ title: 'Interstellar' });

      const missing = await gql<{ film: unknown }>(
        `query($id: ID!){ film(id:$id){ title } }`,
        { id: MISSING_ID },
      );
      expect(missing.errors).toBeUndefined();
      expect(missing.data!.film).toBeNull();
    });

    it('film(id) with a malformed id gives BAD_USER_INPUT', async () => {
      const body = await gql(`query($id: ID!){ film(id:$id){ title } }`, {
        id: BAD_ID,
      });
      expect(codeOf(body)).toBe('BAD_USER_INPUT');
    });

    it('createFilm with an out-of-range value gives BAD_USER_INPUT', async () => {
      const body = await gql(
        `mutation($i: CreateFilmInput!){ createFilm(input:$i){ id } }`,
        { i: { title: 'X', durationMinutes: 0, releaseYear: 2000 } },
      );
      expect(codeOf(body)).toBe('BAD_USER_INPUT');
    });

    it('updateFilm changes only the given fields; missing id gives NOT_FOUND', async () => {
      const id = await makeFilm();
      const updated = await gql<{ updateFilm: Record<string, unknown> }>(
        `mutation($id: ID!, $i: UpdateFilmInput!){ updateFilm(id:$id, input:$i){ title durationMinutes releaseYear } }`,
        { id, i: { title: 'Interstellar (IMAX)' } },
      );
      expect(updated.data!.updateFilm).toEqual({
        title: 'Interstellar (IMAX)',
        durationMinutes: 169,
        releaseYear: 2014,
      });

      const missing = await gql(
        `mutation($id: ID!, $i: UpdateFilmInput!){ updateFilm(id:$id, input:$i){ title } }`,
        { id: MISSING_ID, i: { title: 'x' } },
      );
      expect(codeOf(missing)).toBe('NOT_FOUND');
    });

    it('deleteFilm returns true; a referenced film gives CONFLICT', async () => {
      const filmId = await makeFilm();
      const hallId = await makeHall();
      await makeShowing(filmId, hallId);

      const blocked = await gql(`mutation($id: ID!){ deleteFilm(id:$id) }`, {
        id: filmId,
      });
      expect(codeOf(blocked)).toBe('CONFLICT');

      const other = await makeFilm('Tenet', 150, 2020);
      const ok = await gql<{ deleteFilm: boolean }>(
        `mutation($id: ID!){ deleteFilm(id:$id) }`,
        { id: other },
      );
      expect(ok.data!.deleteFilm).toBe(true);
    });
  });

  // ---------------------------------------------------------------- Halls ---
  describe('Halls', () => {
    it('createHall then duplicate name gives CONFLICT (case-insensitive)', async () => {
      await makeHall('Blue Hall', 4, 6);
      const dup = await gql(
        `mutation($i: CreateHallInput!){ createHall(input:$i){ id } }`,
        { i: { name: 'blue hall', rows: 2, seatsPerRow: 2 } },
      );
      expect(codeOf(dup)).toBe('CONFLICT');
    });

    it('halls has no seats field, but the type exposes rows/seatsPerRow', async () => {
      await makeHall('Red Hall', 3, 5);
      const body = await gql<{ halls: Record<string, unknown>[] }>(
        `{ halls { id name rows seatsPerRow } }`,
      );
      expect(body.data!.halls[0]).toEqual({
        id: anyObjectId,
        name: 'Red Hall',
        rows: 3,
        seatsPerRow: 5,
      });
    });

    it('deleteHall referenced by a showing gives CONFLICT', async () => {
      const filmId = await makeFilm();
      const hallId = await makeHall();
      await makeShowing(filmId, hallId);
      const body = await gql(`mutation($id: ID!){ deleteHall(id:$id) }`, {
        id: hallId,
      });
      expect(codeOf(body)).toBe('CONFLICT');
    });
  });

  // ------------------------------------------------------------- Showings ---
  describe('Showings', () => {
    it('createShowing fills the seat map and leaves bookings empty', async () => {
      const filmId = await makeFilm();
      const hallId = await makeHall('Red Hall', 2, 3);
      const body = await gql<{
        createShowing: { seats: unknown[]; bookings: unknown[] };
      }>(
        `mutation($i: CreateShowingInput!){ createShowing(input:$i){ id seats { row seat isBooked } bookings { id } } }`,
        { i: { filmId, hallId, startsAt: FUTURE, price: 15000 } },
      );
      expect(body.data!.createShowing.seats).toHaveLength(6); // 2 x 3
      expect(body.data!.createShowing.bookings).toEqual([]);
    });

    it('createShowing with missing film or hall gives NOT_FOUND', async () => {
      const hallId = await makeHall();
      const body = await gql(
        `mutation($i: CreateShowingInput!){ createShowing(input:$i){ id } }`,
        { i: { filmId: MISSING_ID, hallId, startsAt: FUTURE, price: 100 } },
      );
      expect(codeOf(body)).toBe('NOT_FOUND');
    });

    it('createShowing in the past gives BAD_USER_INPUT', async () => {
      const filmId = await makeFilm();
      const hallId = await makeHall();
      const body = await gql(
        `mutation($i: CreateShowingInput!){ createShowing(input:$i){ id } }`,
        { i: { filmId, hallId, startsAt: PAST, price: 100 } },
      );
      expect(codeOf(body)).toBe('BAD_USER_INPUT');
    });

    it('showings paginates, filters by filmId/date and sorts by start time', async () => {
      const filmA = await makeFilm('A', 100, 2000);
      const filmB = await makeFilm('B', 100, 2001);
      const hallId = await makeHall('Red Hall', 2, 2);
      await makeShowing(filmA, hallId, '2030-01-15T18:00:00.000Z');
      await makeShowing(filmA, hallId, '2030-01-16T18:00:00.000Z');
      await makeShowing(filmB, hallId, '2030-01-17T18:00:00.000Z');

      const page = await gql<{
        showings: { items: { id: string }[]; total: number; limit: number };
      }>(`{ showings(limit: 2){ items { id } total page limit } }`);
      expect(page.data!.showings.items).toHaveLength(2);
      expect(page.data!.showings.total).toBe(3);
      expect(page.data!.showings.limit).toBe(2);

      const byFilm = await gql<{ showings: { total: number } }>(
        `query($f: ID){ showings(filmId:$f){ total } }`,
        { f: filmA },
      );
      expect(byFilm.data!.showings.total).toBe(2);

      const byDate = await gql<{ showings: { total: number } }>(
        `{ showings(date:"2030-01-17"){ total } }`,
      );
      expect(byDate.data!.showings.total).toBe(1);

      const desc = await gql<{
        showings: { items: { startsAt: string }[] };
      }>(`{ showings(sort: DESC){ items { startsAt } } }`);
      const times = desc.data!.showings.items.map((s) => s.startsAt);
      expect(times).toEqual([...times].sort().reverse());
    });

    it('showing(id) resolves the nested film title and hall name', async () => {
      const filmId = await makeFilm('Interstellar', 169, 2014);
      const hallId = await makeHall('Red Hall', 2, 2);
      const id = await makeShowing(filmId, hallId);
      const body = await gql<{
        showing: { film: { title: string }; hall: { name: string } };
      }>(`query($id: ID!){ showing(id:$id){ film { title } hall { name } } }`, {
        id,
      });
      expect(body.data!.showing.film.title).toBe('Interstellar');
      expect(body.data!.showing.hall.name).toBe('Red Hall');
    });
  });

  // ------------------------------------------------------------- Bookings ---
  describe('Bookings', () => {
    async function setup(): Promise<string> {
      const filmId = await makeFilm();
      const hallId = await makeHall('Red Hall', 3, 5);
      return makeShowing(filmId, hallId);
    }

    it('createBooking books the seats and returns the booking', async () => {
      const showingId = await setup();
      const body = await gql<{
        createBooking: { id: string; showingId: string; totalPrice: number };
      }>(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id showingId seats { row seat } totalPrice } }`,
        {
          s: showingId,
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 2 },
          ],
        },
      );
      expect(body.errors).toBeUndefined();
      expect(body.data!.createBooking.showingId).toBe(showingId);
      expect(body.data!.createBooking.totalPrice).toBe(30000);
    });

    it('a seat already booked gives CONFLICT and books nothing', async () => {
      const showingId = await setup();
      await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        { s: showingId, seats: [{ row: 1, seat: 1 }] },
      );
      const clash = await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        {
          s: showingId,
          seats: [
            { row: 1, seat: 1 },
            { row: 2, seat: 2 },
          ],
        },
      );
      expect(codeOf(clash)).toBe('CONFLICT');

      // seat (2,2) must NOT have been booked by the failed request.
      const page = await gql<{
        showing: { seats: { row: number; seat: number; isBooked: boolean }[] };
      }>(`query($id: ID!){ showing(id:$id){ seats { row seat isBooked } } }`, {
        id: showingId,
      });
      const booked = page.data!.showing.seats.filter((s) => s.isBooked);
      expect(booked).toEqual([{ row: 1, seat: 1, isBooked: true }]);
    });

    it('empty / duplicate / out-of-hall seats give BAD_USER_INPUT', async () => {
      const showingId = await setup();
      const empty = await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        { s: showingId, seats: [] },
      );
      expect(codeOf(empty)).toBe('BAD_USER_INPUT');

      const dup = await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        {
          s: showingId,
          seats: [
            { row: 1, seat: 1 },
            { row: 1, seat: 1 },
          ],
        },
      );
      expect(codeOf(dup)).toBe('BAD_USER_INPUT');

      const outside = await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        { s: showingId, seats: [{ row: 99, seat: 99 }] },
      );
      expect(codeOf(outside)).toBe('BAD_USER_INPUT');
    });

    it('createBooking on a missing showing gives NOT_FOUND', async () => {
      const body = await gql(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        { s: MISSING_ID, seats: [{ row: 1, seat: 1 }] },
      );
      expect(codeOf(body)).toBe('NOT_FOUND');
    });

    it('bookings lists all bookings; cancelBooking frees the seats', async () => {
      const showingId = await setup();
      const created = await gql<{ createBooking: { id: string } }>(
        `mutation($s: ID!, $seats: [SeatInput!]!){ createBooking(showingId:$s, seats:$seats){ id } }`,
        { s: showingId, seats: [{ row: 1, seat: 1 }] },
      );
      const bookingId = created.data!.createBooking.id;

      const list = await gql<{ bookings: { id: string }[] }>(
        `{ bookings { id showingId totalPrice } }`,
      );
      expect(list.data!.bookings).toHaveLength(1);
      expect(list.data!.bookings[0].id).toBe(bookingId);

      const cancelled = await gql<{ cancelBooking: boolean }>(
        `mutation($id: ID!){ cancelBooking(id:$id) }`,
        { id: bookingId },
      );
      expect(cancelled.data!.cancelBooking).toBe(true);

      const after = await gql<{ bookings: unknown[] }>(`{ bookings { id } }`);
      expect(after.data!.bookings).toEqual([]);
    });

    it('cancelBooking on a missing booking gives NOT_FOUND', async () => {
      const body = await gql(`mutation($id: ID!){ cancelBooking(id:$id) }`, {
        id: MISSING_ID,
      });
      expect(codeOf(body)).toBe('NOT_FOUND');
    });
  });

  // ----------------------------------------------------------------- N+1 ---
  describe('N+1 (DataLoader batching)', () => {
    it('a page of showings with nested film/hall triggers one query per collection', async () => {
      const filmA = await makeFilm('A', 100, 2000);
      const filmB = await makeFilm('B', 100, 2001);
      const hallId = await makeHall('Red Hall', 2, 2);
      // Four showings over two films — the field resolvers would otherwise
      // read the film once per showing.
      await makeShowing(filmA, hallId, '2030-02-01T18:00:00.000Z');
      await makeShowing(filmB, hallId, '2030-02-02T18:00:00.000Z');
      await makeShowing(filmA, hallId, '2030-02-03T18:00:00.000Z');
      await makeShowing(filmB, hallId, '2030-02-04T18:00:00.000Z');

      const filmFind = jest.spyOn(filmModel, 'find');
      const hallFind = jest.spyOn(hallModel, 'find');

      // Without the nested object fields, the loaders are never touched.
      filmFind.mockClear();
      hallFind.mockClear();
      await gql(`{ showings { items { id } } }`);
      expect(filmFind).not.toHaveBeenCalled();
      expect(hallFind).not.toHaveBeenCalled();

      // With film { title } and hall { name }, each is read in ONE batched query.
      filmFind.mockClear();
      hallFind.mockClear();
      const body = await gql<{
        showings: { items: { film: { title: string } }[] };
      }>(`{ showings { items { id film { title } hall { name } } } }`);
      expect(body.data!.showings.items).toHaveLength(4);
      expect(filmFind).toHaveBeenCalledTimes(1);
      expect(hallFind).toHaveBeenCalledTimes(1);

      filmFind.mockRestore();
      hallFind.mockRestore();
    });
  });
});
