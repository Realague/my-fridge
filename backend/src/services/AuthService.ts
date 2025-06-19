import { OAuth2Client } from 'google-auth-library';
import { UserRepository } from '../repositories/UserRepository';
import { 
  GoogleOAuthExchangeDto, 
  GoogleTokenVerifyDto, 
  UpdateUserDto,
  UserResponseDto, 
  AuthResponseDto,
  UserQueryDto
} from '../types/AuthDto';
import { ValidationError, NotFoundError, UnauthorizedError } from '../errors/CustomErrors';

export class AuthService {
  private googleClient: OAuth2Client;

  constructor(private userRepository: UserRepository) {
    this.googleClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'postmessage'
    );
  }

  async exchangeGoogleCode(exchangeDto: GoogleOAuthExchangeDto): Promise<AuthResponseDto> {
    // Validation
    this.validateGoogleOAuthExchangeDto(exchangeDto);

    try {
      // Exchange code for tokens using client secret (backend only)
      const { tokens } = await this.googleClient.getToken(exchangeDto.code);

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

      return {
        user: this.transformToUserResponseDto(user),
        token: tokens.id_token,
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

  async verifyGoogleToken(verifyDto: GoogleTokenVerifyDto): Promise<AuthResponseDto> {
    // Validation
    this.validateGoogleTokenVerifyDto(verifyDto);

    try {
      // Verify the token with Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: verifyDto.token,
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

      return {
        user: this.transformToUserResponseDto(user),
        message: 'Token verification successful'
      };
    } catch (error) {
      console.error('Token verification error:', error);
      if (error instanceof ValidationError || error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  async authenticateUserByToken(token: string): Promise<UserResponseDto> {
    try {
      // Verify the token with Google
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

  async getAllUsers(query?: UserQueryDto): Promise<UserResponseDto[]> {
    // This would typically be admin-only
    const users = await this.userRepository.findAll({
      limit: query?.limit || 10,
      offset: query?.offset || 0,
      sortBy: query?.sortBy || 'createdAt',
      sortOrder: query?.sortOrder || 'DESC',
      search: query?.search
    });

    return users.map(this.transformToUserResponseDto);
  }

  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(email => email.trim());
    return adminEmails.includes(user.email);
  }

  private validateGoogleOAuthExchangeDto(dto: GoogleOAuthExchangeDto): void {
    if (!dto.code || dto.code.trim().length === 0) {
      throw new ValidationError('Authorization code is required');
    }
  }

  private validateGoogleTokenVerifyDto(dto: GoogleTokenVerifyDto): void {
    if (!dto.token || dto.token.trim().length === 0) {
      throw new ValidationError('Token is required');
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