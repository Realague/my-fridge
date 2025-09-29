import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateGoogleToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

// Validation schemas for the middleware
const GoogleOAuthExchangeSchema = { name: 'GoogleOAuthExchangeDto' };
const UpdateUserSchema = { name: 'UpdateUserDto' };

// Dependency injection setup
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

const router = Router();

// Public routes (no authentication required)

// Exchange OAuth code for tokens (called by frontend)
router.post('/google/exchange',
  validateRequest(GoogleOAuthExchangeSchema),
  authController.exchangeGoogleCode.bind(authController)
);

// Removed verify-google-token endpoint - using pure OAuth2 flow

// Refresh JWT token endpoint (no authentication required - uses refresh token validation)
router.post('/refresh',
  authController.refreshToken.bind(authController)
);

// Protected routes (authentication required)

// Get current user (protected route)
router.get('/me',
  authenticateGoogleToken,
  authController.getCurrentUser.bind(authController)
);

// Update current user profile
router.put('/me',
  authenticateGoogleToken,
  validateRequest(UpdateUserSchema),
  authController.updateUser.bind(authController)
);

// Delete current user account
router.delete('/me',
  authenticateGoogleToken,
  authController.deleteUser.bind(authController)
);

// Check admin status
router.get('/admin/status',
  authenticateGoogleToken,
  authController.checkAdminStatus.bind(authController)
);

// Logout route
router.post('/logout',
  authController.logout.bind(authController)
);

export default router; 