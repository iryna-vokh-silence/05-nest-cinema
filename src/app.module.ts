import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { BookingsModule } from './bookings/bookings.module';
import { GraphqlExceptionFilter } from './common/filters/graphql-exception.filter';
import { GraphqlContext } from './common/loaders/graphql-context';
import { LoadersFactory } from './common/loaders/loaders.factory';
import { LoadersModule } from './common/loaders/loaders.module';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { FilmsModule } from './films/films.module';
import { HallsModule } from './halls/halls.module';
import { ShowingsModule } from './showings/showings.module';

type Env = ConfigService<EnvironmentVariables, true>;

/** Path of the schema file generated from the code-first types at startup. */
const SCHEMA_FILE = join(process.cwd(), 'src', 'schema.gql');

@Module({
  imports: [
    // Reads .env and validates it with EnvironmentVariables: the app does not
    // start if MONGODB_URI is missing or invalid.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: Env) => ({
        uri: config.get('MONGODB_URI', { infer: true }),
        // Fail fast at startup instead of waiting 30 s for an unreachable server.
        serverSelectionTimeoutMS: 5000,
      }),
    }),
    // Code-first GraphQL on the Apollo driver. The SDL is generated from the
    // decorated classes into SCHEMA_FILE (committed to the repository). Every
    // request gets a fresh set of DataLoaders in its context.
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [LoadersModule],
      inject: [LoadersFactory],
      useFactory: (loadersFactory: LoadersFactory) => ({
        autoSchemaFile: SCHEMA_FILE,
        sortSchema: true,
        introspection: true,
        // The Apollo landing page / sandbox is served at the GraphQL endpoint.
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault({ embed: true })],
        context: (): GraphqlContext => ({ loaders: loadersFactory.create() }),
      }),
    }),
    FilmsModule,
    HallsModule,
    ShowingsModule,
    BookingsModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: GraphqlExceptionFilter }],
})
export class AppModule {}
