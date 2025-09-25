export interface GoogleOAuthExchangeDto {
  code: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
}

export interface UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  googleId?: string;
  selectedHouseholdId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
  accessTokenExpiresAt: Date;
  message?: string;
}

export interface AuthErrorDto {
  message: string;
  error?: string;
}