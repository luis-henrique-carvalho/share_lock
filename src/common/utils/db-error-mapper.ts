import { DrizzleQueryError, DrizzleError } from 'drizzle-orm';
import { DatabaseError } from 'pg';

export interface FieldError {
  field: string;
  message: string;
}

export function getDbErrorMessage(error: unknown): FieldError[] {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    const pgError = error.cause;

    switch (pgError.code) {
      case '23505': {
        const detail = pgError.detail ?? '';
        const match = detail.match(/\(([^)]+)\)=\([^)]+\)/);
        const fields = match
          ? match[1].split(',').map((f) => f.trim())
          : ['global'];
        return fields.map((field) => ({
          field,
          message: 'A duplicate entry was found for this field.',
        }));
      }

      case '23503': {
        const detail = pgError.detail ?? '';
        const match = detail.match(/\(([^)]+)\)=\([^)]+\)/);
        const fieldName = match ? match[1].trim() : 'unknown';
        return [
          {
            field: 'global',
            message: `Related record not found for '${fieldName}'.`,
          },
        ];
      }

      case '22P02':
        return [{ field: 'global', message: 'Invalid input format.' }];

      case '23514':
        return [
          {
            field: pgError.constraint ?? 'global',
            message: 'Check constraint violation.',
          },
        ];

      case '23502':
        return [
          {
            field: pgError.column ?? 'global',
            message: `Required field '${pgError.column}' is missing.`,
          },
        ];

      default:
        return [
          { field: 'global', message: `Database error: ${pgError.message}` },
        ];
    }
  }

  if (error instanceof DrizzleError || error instanceof Error) {
    return [
      {
        field: 'global',
        message: error.message ?? 'An unexpected error occurred.',
      },
    ];
  }

  return [{ field: 'global', message: 'An unknown error occurred.' }];
}
