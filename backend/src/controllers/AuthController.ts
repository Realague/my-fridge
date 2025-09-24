import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { ApiResponse } from '../types/ApiResponse';
import { 
  GoogleOAuthExchangeDto, 
  UpdateUserDto,
} from '../types/AuthDto';

export class AuthController {
  constructor(private authService: AuthService) {}

  async exchangeGoogleCode(req: Request, res: Response): Promise<void> {
    try {
      const exchangeDto: GoogleOAuthExchangeDto = req.body;
      
      const authResponse = await this.authService.exchangeGoogleCode(exchangeDto);
      
      const response: ApiResponse = {
        success: true,
        data: authResponse,
        message: authResponse.message || 'Authentication successful'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      
      const user = await this.authService.getCurrentUser(userId);
      
      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'User retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      const updateDto: UpdateUserDto = req.body;
      
      const user = await this.authService.updateUser(userId, updateDto);
      
      const response: ApiResponse = {
        success: true,
        data: { user },
        message: 'User updated successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      
      await this.authService.deleteUser(userId);
      
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'User deleted successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // Revoke refresh token if user is authenticated
      if (req.user) {
        const userId = (req.user as any).id;
        await this.authService.revokeAllUserTokens(userId);
      }
      
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'Logged out successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async checkAdminStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      
      const isAdmin = await this.authService.isAdmin(userId);
      
      const response: ApiResponse = {
        success: true,
        data: { isAdmin },
        message: 'Admin status retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any).id;
      
      const tokenResponse = await this.authService.refreshTokenForUser(userId);
      
      const response: ApiResponse = {
        success: true,
        data: tokenResponse,
        message: 'Token refreshed successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: any): void {
    console.error('Auth Controller error:', error);
    
    if (error.name === 'ValidationError') {
      res.status(400).json({
        success: false,
        error: error.message,
        details: error.details
      });
    } else if (error.name === 'NotFoundError') {
      res.status(404).json({
        success: false,
        error: error.message
      });
    } else if (error.name === 'UnauthorizedError') {
      res.status(401).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
} 