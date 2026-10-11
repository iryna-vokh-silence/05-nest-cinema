import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

/**
 * GraphQL error codes used across the schema. The client reads the code from
 * `errors[0].extensions.code` and branches on it.
 */
export const ERROR_CODES = {
  BAD_USER_INPUT: 'BAD_USER_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_SERVER_ERROR',
} as const;

/** HTTP status (thrown by the services and the ValidationPipe) -> GraphQL code. */
const STATUS_TO_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: ERROR_CODES.BAD_USER_INPUT,
  [HttpStatus.NOT_FOUND]: ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: ERROR_CODES.CONFLICT,
};

/**
 * Turns the exceptions thrown inside resolvers into GraphQL errors with a
 * stable `code` in `extensions`.
 *
 *  - the domain HttpExceptions of the services (404/409) and the
 *    BadRequestException of the ValidationPipe (400) are mapped to
 *    NOT_FOUND / CONFLICT / BAD_USER_INPUT;
 *  - anything else (e.g. a database error) is logged on the server and
 *    returned as a generic INTERNAL_SERVER_ERROR, so no database detail
 *    reaches the client.
 */
@Catch()
export class GraphqlExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger('GraphQL');

  catch(exception: unknown): GraphQLError {
    if (exception instanceof GraphQLError) {
      return exception;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = STATUS_TO_CODE[status] ?? ERROR_CODES.INTERNAL;
      if (code === ERROR_CODES.INTERNAL) {
        // An unexpected HTTP status: log it, hide the detail.
        this.logger.error(exception.message, exception.stack);
        return this.internal();
      }
      return new GraphQLError(this.messageOf(exception), {
        extensions: { code },
      });
    }

    // Unknown error (database, programming bug): never leak the message.
    const error = exception instanceof Error ? exception : undefined;
    this.logger.error(
      error?.message ?? 'Unknown error',
      error?.stack ?? String(exception),
    );
    return this.internal();
  }

  /** Pulls the human-readable message out of an HttpException response. */
  private messageOf(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) {
      return message.join(', ');
    }
    if (typeof message === 'string') {
      return message;
    }
    return exception.message;
  }

  private internal(): GraphQLError {
    return new GraphQLError('Internal server error', {
      extensions: { code: ERROR_CODES.INTERNAL },
    });
  }
}
