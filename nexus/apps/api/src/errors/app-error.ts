export type AppErrorCode =
  | 'BAD_USER_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INVALID_TRANSITION';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: AppErrorCode,
    public readonly httpStatus: number,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id: string) {
    super(`${entity} ${id} was not found`, 'NOT_FOUND', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

export class InvalidTransitionError extends AppError {
  constructor(entity: string, from: string, to: string) {
    super(
      `${entity} cannot move from ${from} to ${to}`,
      'INVALID_TRANSITION',
      409,
    );
  }
}

export class InputError extends AppError {
  constructor(message: string) {
    super(message, 'BAD_USER_INPUT', 400);
  }
}