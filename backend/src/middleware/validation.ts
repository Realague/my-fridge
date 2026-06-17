import { Request, Response, NextFunction } from 'express';

export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validateSchema(req.body, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
      }
      
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request format'
      });
    }
  };
}

function validateSchema(data: any, schema: any): string[] {
  const errors: string[] = [];
  
  // This is a simplified validation - in a real app you'd use a proper validator
  if (schema.name === 'CreateHouseholdDto') {
    if (!data.name || typeof data.name !== 'string') {
      errors.push('Name is required and must be a string');
    }
    if (data.name && data.name.trim().length === 0) {
      errors.push('Name cannot be empty');
    }
    if (data.name && data.name.length > 100) {
      errors.push('Name must be 100 characters or less');
    }
    if (data.description && typeof data.description !== 'string') {
      errors.push('Description must be a string');
    }
    if (data.description && data.description.length > 500) {
      errors.push('Description must be 500 characters or less');
    }
  }

  if (schema.name === 'UpdateHouseholdDto') {
    if (data.name !== undefined) {
      if (!data.name || typeof data.name !== 'string') {
        errors.push('Name must be a string');
      }
      if (data.name && data.name.trim().length === 0) {
        errors.push('Name cannot be empty');
      }
      if (data.name && data.name.length > 100) {
        errors.push('Name must be 100 characters or less');
      }
    }
    if (data.description !== undefined && data.description !== null) {
      if (typeof data.description !== 'string') {
        errors.push('Description must be a string');
      }
      if (data.description && data.description.length > 500) {
        errors.push('Description must be 500 characters or less');
      }
    }
  }

  if (schema.name === 'JoinHouseholdDto') {
    if (!data.inviteCode || typeof data.inviteCode !== 'string') {
      errors.push('Invite code is required and must be a string');
    }
    if (data.inviteCode && data.inviteCode.trim().length === 0) {
      errors.push('Invite code cannot be empty');
    }
    if (data.inviteCode && data.inviteCode.trim().length !== 8) {
      errors.push('Invite code must be 8 characters long');
    }
  }

  // Auth validation schemas
  if (schema.name === 'GoogleOAuthExchangeDto') {
    if (!data.code || typeof data.code !== 'string') {
      errors.push('Authorization code is required and must be a string');
    }
    if (data.code && data.code.trim().length === 0) {
      errors.push('Authorization code cannot be empty');
    }
  }

  if (schema.name === 'GoogleTokenVerifyDto') {
    if (!data.token || typeof data.token !== 'string') {
      errors.push('Token is required and must be a string');
    }
    if (data.token && data.token.trim().length === 0) {
      errors.push('Token cannot be empty');
    }
  }

  if (schema.name === 'UpdateUserDto') {
    if (data.firstName !== undefined) {
      if (!data.firstName || typeof data.firstName !== 'string') {
        errors.push('First name must be a string');
      }
      if (data.firstName && data.firstName.trim().length === 0) {
        errors.push('First name cannot be empty');
      }
      if (data.firstName && data.firstName.length > 50) {
        errors.push('First name must be 50 characters or less');
      }
    }

    if (data.lastName !== undefined) {
      if (!data.lastName || typeof data.lastName !== 'string') {
        errors.push('Last name must be a string');
      }
      if (data.lastName && data.lastName.trim().length === 0) {
        errors.push('Last name cannot be empty');
      }
      if (data.lastName && data.lastName.length > 50) {
        errors.push('Last name must be 50 characters or less');
      }
    }

    if (data.email !== undefined) {
      if (!data.email || typeof data.email !== 'string') {
        errors.push('Email must be a string');
      }
      if (data.email && data.email.trim().length === 0) {
        errors.push('Email cannot be empty');
      }
      if (data.email && !isValidEmail(data.email)) {
        errors.push('Invalid email format');
      }
    }

    if (data.lowStockAlertsEnabled !== undefined && typeof data.lowStockAlertsEnabled !== 'boolean') {
      errors.push('lowStockAlertsEnabled must be a boolean');
    }
  }
   
  // Meal validation schemas
  if (schema.name === 'CreateMealDto') {
    if (!data.recipeId || typeof data.recipeId !== 'string') {
      errors.push('Recipe ID is required and must be a string');
    }
    if (data.servings !== undefined) {
      if (typeof data.servings !== 'number' || data.servings < 1 || data.servings > 20) {
        errors.push('Servings must be a number between 1 and 20');
      }
    }
    if (data.notes !== undefined && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push('Notes must be a string');
      }
      if (data.notes && data.notes.length > 500) {
        errors.push('Notes must be 500 characters or less');
      }
    }
  }

  if (schema.name === 'UpdateMealDto') {
    if (data.servings === undefined) {
      errors.push('servings is required');
    } else if (typeof data.servings !== 'number' || data.servings < 1 || data.servings > 20) {
      errors.push('Servings must be a number between 1 and 20');
    }
  }
   
  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateQuery(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validateQueryParams(req.query, schema);
      
      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors
        });
      }
      
      return next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query format'
      });
    }
  };
}

function validateQueryParams(query: any, schema: any): string[] {
  const errors: string[] = [];
  
  if (query.limit && isNaN(Number(query.limit))) {
    errors.push('Limit must be a number');
  }
  
  if (query.offset && isNaN(Number(query.offset))) {
    errors.push('Offset must be a number');
  }
  
  if (query.sortOrder && !['ASC', 'DESC'].includes(query.sortOrder)) {
    errors.push('Sort order must be ASC or DESC');
  }
  
  return errors;
}

// Meal validators
export const validateMealCreate = validateRequest({ name: 'CreateMealDto' });
export const validateMealUpdate = validateRequest({ name: 'UpdateMealDto' });