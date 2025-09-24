import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';

// Create a single instance of AuthService for middleware use
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);

export async function authenticateGoogleToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false,
        error: 'Access token required' 
      });
    }

    // Use AuthService to authenticate user with Google ID token
    const user = await authService.authenticateUserByToken(token);
    req.user = user;
    
    return next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token' 
    });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required' 
      });
    }

    const userId = (req.user as any).id;
    const isAdmin = await authService.isAdmin(userId);
    
    if (!isAdmin) {
      return res.status(403).json({ 
        success: false,
        error: 'Admin access required' 
      });
    }

    return next();
  } catch (error) {
    return res.status(403).json({ 
      success: false,
      error: 'Admin access denied' 
    });
  }
} 