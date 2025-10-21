// src/common/filters/drizzle-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DrizzleQueryError, DrizzleError } from 'drizzle-orm';
import { getDbErrorMessage } from '../utils/db-error-mapper';

@Catch(DrizzleQueryError)
export class DrizzleExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DrizzleExceptionFilter.name);

  catch(exception: DrizzleQueryError | DrizzleError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errors = getDbErrorMessage(exception);

    const status = errors.some((e) => e.field !== 'global')
      ? HttpStatus.CONFLICT
      : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      errors,
    });
  }
}
