import { Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { NotFoundError } from '../errors/CustomErrors';
import { ApiResponse } from '../types/ApiResponse';
import { 
  GoogleOAuthExchangeDto, 
  GoogleTokenVerifyDto, 
  UpdateUserDto,
  UserQueryDto
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

  async verifyGoogleToken(req: Request, res: Response): Promise<void> {
    try {
      const verifyDto: GoogleTokenVerifyDto = req.body;
      
      const authResponse = await this.authService.verifyGoogleToken(verifyDto);
      
      const response: ApiResponse = {
        success: true,
        data: authResponse,
        message: authResponse.message || 'Token verification successful'
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

  async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const query: UserQueryDto = req.query;
      
      const users = await this.authService.getAllUsers(query);
      
      const response: ApiResponse = {
        success: true,
        data: { users },
        message: 'Users retrieved successfully'
      };
      
      res.json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      // For Google OAuth with ID tokens, logout is primarily handled client-side
      // Here we can perform any server-side cleanup if needed
      
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