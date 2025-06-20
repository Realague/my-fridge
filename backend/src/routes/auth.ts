import { Router } from 'express';
import passport from 'passport';
import { AuthController } from '../controllers/AuthController';
import { AuthService } from '../services/AuthService';
import { UserRepository } from '../repositories/UserRepository';
import { authenticateGoogleToken, requireAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

// Validation schemas for the middleware
const GoogleOAuthExchangeSchema = { name: 'GoogleOAuthExchangeDto' };
const GoogleTokenVerifySchema = { name: 'GoogleTokenVerifyDto' };
const UpdateUserSchema = { name: 'UpdateUserDto' };

// Dependency injection setup
const userRepository = new UserRepository();
const authService = new AuthService(userRepository);
const authController = new AuthController(authService);

const router = Router();

// Public routes (no authentication required)

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth?error=authentication_failed`);
    }

    // Instead of creating our own JWT, we'll let the frontend handle the Google token
    // The frontend will get the token from Google's OAuth flow
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=true`);
  }
);

// Exchange OAuth code for tokens (called by frontend)
router.post('/google/exchange',
  validateRequest(GoogleOAuthExchangeSchema),
  authController.exchangeGoogleCode.bind(authController)
);

// Verify Google token endpoint (called by frontend)
router.post('/verify-google-token',
  validateRequest(GoogleTokenVerifySchema),
  authController.verifyGoogleToken.bind(authController)
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

// Admin-only routes

// Get all users (admin only)
router.get('/admin/users',
  authenticateGoogleToken,
  requireAdmin,
  authController.getAllUsers.bind(authController)
);

export default router; 