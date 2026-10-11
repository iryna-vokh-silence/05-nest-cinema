import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Shared application configuration. Used by main.ts and by the e2e tests, so
 * the tests run against exactly the same validation setup.
 *
 * The global ValidationPipe validates the GraphQL `@InputType` / `@ArgsType`
 * arguments of the resolvers with class-validator; a failure is turned into a
 * BAD_USER_INPUT GraphQL error by the exception filter.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      // One message per invalid property instead of every failing rule.
      stopAtFirstError: true,
    }),
  );
}
