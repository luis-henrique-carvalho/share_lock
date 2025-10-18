import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();

    let message: string | string[];

    if (typeof errorResponse === 'string') {
      message = errorResponse;
    } else if (
      errorResponse &&
      typeof errorResponse === 'object' &&
      'message' in errorResponse
    ) {
      message = (errorResponse as { message: string | string[] }).message;
    } else {
      message = 'An unexpected internal server error occurred';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}
