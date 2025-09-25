import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from '../repositories/UserRepository';
import { 
  GoogleOAuthExchangeDto, 
  UpdateUserDto,
  UserResponseDto, 
  AuthResponseDto,
} from '../types/AuthDto';
import { ValidationError, NotFoundError, UnauthorizedError } from '../errors/CustomErrors';

export class AuthService {
  private googleClient: OAuth2Client;

  constructor(private userRepository: UserRepository) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
  }

  async exchangeGoogleCode(exchangeDto: GoogleOAuthExchangeDto): Promise<AuthResponseDto> {
    // Validation
    this.validateGoogleOAuthExchangeDto(exchangeDto);

    try {
      const redirectUri = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/auth` : 'http://localhost:3000/auth';
      
      // Exchange code for tokens using client secret (backend only)
      const { tokens } = await this.googleClient.getToken({
        code: exchangeDto.code,
        redirect_uri: redirectUri
      });

      if (!tokens.id_token) {
        throw new ValidationError('No ID token received');
      }

      // Verify the ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Invalid token');
      }

      // Find or create user in our database
      let user = await this.userRepository.findByGoogleId(payload.sub);

      if (!user) {
        user = await this.userRepository.create({
          googleId: payload.sub,
          email: payload.email!,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
        });
      }

      // Store Google refresh token if available
      if (tokens.refresh_token) {
        await this.userRepository.updateRefreshToken(
          user.id,
          tokens.refresh_token,
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // Google refresh tokens last ~6 months
        );
      }

      return {
        user: this.transformToUserResponseDto(user),
        accessToken: tokens.id_token, // Use Google ID token as access token
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // ID tokens expire in 1 hour
        message: 'Authentication successful'
      };
    } catch (error) {
      console.error('OAuth code exchange error:', error);
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Authentication failed');
    }
  }

  async authenticateUserByToken(token: string): Promise<UserResponseDto> {
    try {
      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedError('Invalid token');
      }

      // Find user in database
      const user = await this.userRepository.findByGoogleId(payload.sub);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return this.transformToUserResponseDto(user);
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      // Check if it's a token expiration error
      if (error instanceof Error && error.message.includes('Token used too late')) {
        throw new UnauthorizedError('Token has expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return this.transformToUserResponseDto(user);
  }

  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto> {
    // Validation
    this.validateUpdateUserDto(updateDto);

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // Update user
    await this.userRepository.update(userId, updateDto);

    // Return updated user
    const updatedUser = await this.userRepository.findById(userId);
    return this.transformToUserResponseDto(updatedUser);
  }



  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.delete(userId);
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    return adminEmails.includes(user.email);
  }

  async refreshTokenForUser(userId: string): Promise<{ accessToken: string; accessTokenExpiresAt: Date }> {
    try {
      // Find user by ID
      const user = await this.userRepository.findById(userId);
      if (!user || !user.isRefreshTokenValid()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
      }

      // Use Google's refresh token to get new access token
      this.googleClient.setCredentials({
        refresh_token: user.refreshToken
      });

      const { credentials } = await this.googleClient.refreshAccessToken();
      
      if (!credentials.id_token) {
        throw new UnauthorizedError('Failed to refresh token');
      }

      // Update refresh token if we got a new one
      if (credentials.refresh_token && credentials.refresh_token !== user.refreshToken) {
        await this.userRepository.updateRefreshToken(
          user.id,
          credentials.refresh_token,
          new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // ~6 months
        );
      }

      return {
        accessToken: credentials.id_token,
        accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // ID tokens expire in 1 hour
      };
    } catch (error) {
      console.error('Refresh token error:', error);
      if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const user = await this.userRepository.findByRefreshToken(refreshToken);
    if (user) {
      await this.userRepository.clearRefreshToken(user.id);
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.userRepository.clearRefreshToken(userId);
  }

  private validateGoogleOAuthExchangeDto(dto: GoogleOAuthExchangeDto): void {
    if (!dto.code || dto.code.trim().length === 0) {
      throw new ValidationError('Authorization code is required');
    }
  }


  private validateUpdateUserDto(dto: UpdateUserDto): void {
    if (dto.firstName !== undefined && (!dto.firstName || dto.firstName.trim().length === 0)) {
      throw new ValidationError('First name cannot be empty');
    }

    if (dto.firstName && dto.firstName.length > 50) {
      throw new ValidationError('First name must be 50 characters or less');
    }

    if (dto.lastName !== undefined && (!dto.lastName || dto.lastName.trim().length === 0)) {
      throw new ValidationError('Last name cannot be empty');
    }

    if (dto.lastName && dto.lastName.length > 50) {
      throw new ValidationError('Last name must be 50 characters or less');
    }
  }

  private transformToUserResponseDto(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      googleId: user.googleId,
      selectedHouseholdId: user.selectedHouseholdId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
} 