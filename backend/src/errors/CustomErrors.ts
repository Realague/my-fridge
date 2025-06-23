export class BadRequestError extends Error {
  public override name = 'BadRequestError';
  
  constructor(message: string = 'Bad request') {
    super(message);
  }
}

export class ValidationError extends Error {
  public override name = 'ValidationError';
  public details?: any;
  
  constructor(message: string, details?: any) {
    super(message);
    this.details = details;
  }
}

export class NotFoundError extends Error {
  public override name = 'NotFoundError';
  
  constructor(message: string = 'Resource not found') {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  public override name = 'UnauthorizedError';
  
  constructor(message: string = 'Unauthorized access') {
    super(message);
  }
}

export class ConflictError extends Error {
  public override name = 'ConflictError';
  
  constructor(message: string = 'Resource conflict') {
    super(message);
  }
}

export class DatabaseError extends Error {
  public override name = 'DatabaseError';
  
  constructor(message: string = 'Database operation failed') {
    super(message);
  }
} 