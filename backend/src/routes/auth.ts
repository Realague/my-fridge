import express from 'express';
import passport from 'passport';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const router = express.Router();
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'postmessage' // For popup/code flow
);

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
router.post('/google/exchange', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    // Exchange code for tokens using client secret (backend only)
    const { tokens } = await googleClient.getToken(code);

    if (!tokens.id_token) {
      return res.status(400).json({ message: 'No ID token received' });
    }

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Find or create user in our database
    const { User } = await import('../models/User');
    let user = await User.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        email: payload.email!,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
      });
    }

    // Return user data and the ID token for future API calls
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token: tokens.id_token
    });
  } catch (error) {
    console.error('OAuth code exchange error:', error);
    return res.status(401).json({ 
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Verify Google token endpoint (called by frontend)
router.post('/verify-google-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'Token is required' });
    }

    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Find or create user in our database
    const { User } = await import('../models/User');
    let user = await User.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      user = await User.create({
        googleId: payload.sub,
        email: payload.email!,
        firstName: payload.given_name || '',
        lastName: payload.family_name || '',
      });
    }

    // Return user data
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ message: 'Invalid token' });
  }
});

// Middleware to verify Google token
async function authenticateGoogleToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Find user in database
    const { User } = await import('../models/User');
    const user = await User.findOne({ where: { googleId: payload.sub } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Get current user (protected route)
router.get('/me', authenticateGoogleToken, (req, res) => {
  if (!req.user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  const user = req.user as User;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  });

  return res
});

// Logout route
router.post('/logout', (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
      return res.redirect(`${process.env.FRONTEND_URL}/auth`);
    });
  } catch (error) {
    res.status(500).json({ message: 'Logout failed' });
  }
});

export default router;
export { authenticateGoogleToken }; 