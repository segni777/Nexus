import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/app-error.js';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: 'BAD_USER_INPUT', issues: error.issues },
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  req.log.error({ err: error }, 'Unhandled REST error');
  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
  });
};