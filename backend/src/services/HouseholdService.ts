import { HouseholdRepository } from '../repositories/HouseholdRepository';
import { UserRepository } from '../repositories/UserRepository';
import { CreateHouseholdDto, UpdateHouseholdDto, JoinHouseholdDto, HouseholdQueryDto, HouseholdResponseDto, HouseholdDetailResponseDto, SetSelectedHouseholdDto } from '../types/HouseholdDto';
import { UserResponseDto } from '../types/AuthDto';
import { ValidationError, NotFoundError, UnauthorizedError } from '../errors/CustomErrors';
import { StorageAreaSeeder } from '../seeders/defaultStorageAreas';

export class HouseholdService {
  constructor(
    private householdRepository: HouseholdRepository,
    private userRepository: UserRepository,
    private storageAreaSeeder?: StorageAreaSeeder
  ) {}

  async getUserHouseholds(userId: string, query?: HouseholdQueryDto): Promise<any[]> {
    // Validate user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Business logic: Get user's households with filters
    const households = await this.householdRepository.findByUserId(userId, {
      limit: query?.limit || 10,
      offset: query?.offset || 0,
      sortBy: query?.sortBy || 'createdAt',
      sortOrder: query?.sortOrder || 'DESC'
    });

    return households;
  }

  async createHousehold(userId: string, createDto: CreateHouseholdDto): Promise<any> {
    // Validation
    this.validateCreateHouseholdDto(createDto);

    // Business rules
    const userHouseholdCount = await this.householdRepository.countByUserId(userId);
    if (userHouseholdCount >= 10) {
      throw new ValidationError('Maximum household limit reached');
    }

    // Create household with creator as admin
    const household = await this.householdRepository.create({
      name: createDto.name.trim(),
      description: createDto.description?.trim(),
      createdBy: userId
    });

    // Add creator as admin member
    await this.householdRepository.addMember(household.id, userId, 'admin');

    // Create selected storage areas if specified
    if (this.storageAreaSeeder && createDto.storageAreas) {
      try {
        await this.storageAreaSeeder.seedSelectedStorageAreas(household.id, createDto.storageAreas);
      } catch (error) {
        console.warn('Failed to create storage areas for household:', error);
        // Don't fail household creation if storage areas fail
      }
    }

    return household;
  }

  async getHouseholdById(householdId: string, userId: string): Promise<any> {
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    // Check if user has access
    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) {
      throw new UnauthorizedError('Access denied. You are not a member of this household.');
    }

    return household;
  }

  async updateHousehold(householdId: string, userId: string, updateDto: UpdateHouseholdDto): Promise<any> {
    // Validation
    this.validateUpdateHouseholdDto(updateDto);

    // Check if household exists
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    // Check if user is admin of this household
    const isAdmin = await this.householdRepository.isAdmin(householdId, userId);
    if (!isAdmin) {
      throw new UnauthorizedError('Access denied. Admin privileges required.');
    }

    // Update household
    const updateData: any = {};
    if (updateDto.name !== undefined) {
      updateData.name = updateDto.name.trim();
    }
    if (updateDto.description !== undefined) {
      updateData.description = updateDto.description?.trim() || null;
    }

    await this.householdRepository.update(householdId, updateData);

    // Return updated household
    const updatedHousehold = await this.householdRepository.findById(householdId);
    return updatedHousehold;
  }

  async deleteHousehold(householdId: string, userId: string): Promise<void> {
    // Check if household exists
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    // Check if user is admin of this household
    const isAdmin = await this.householdRepository.isAdmin(householdId, userId);
    if (!isAdmin) {
      throw new UnauthorizedError('Access denied. Admin privileges required.');
    }

    // Delete household (this should cascade delete members)
    await this.householdRepository.delete(householdId);
  }

  async joinHousehold(userId: string, joinDto: JoinHouseholdDto): Promise<any> {
    // Validation
    this.validateJoinHouseholdDto(joinDto);

    // Find household by invite code
    const household = await this.householdRepository.findByInviteCode(joinDto.inviteCode.trim().toUpperCase());
    if (!household) {
      throw new NotFoundError('Invalid invite code');
    }

    // Check if user is already a member
    const isMember = await this.householdRepository.isMember(household.id, userId);
    if (isMember) {
      throw new ValidationError('You are already a member of this household');
    }

    // Add user as member
    await this.householdRepository.addMember(household.id, userId, 'member');

    // Return household details
    return household;
  }

  async leaveHousehold(householdId: string, userId: string): Promise<void> {
    // Check if household exists
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    // Check if user is a member
    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) {
      throw new NotFoundError('You are not a member of this household');
    }

    // Check if user is the only admin
    const isAdmin = await this.householdRepository.isAdmin(householdId, userId);
    if (isAdmin) {
      const adminCount = await this.householdRepository.getAdminCount(householdId);
      if (adminCount === 1) {
        throw new ValidationError('Cannot leave household as the only admin. Transfer admin role to another member first.');
      }
    }

    // Remove user from household
    await this.householdRepository.removeMember(householdId, userId);
  }

  async selectHousehold(householdId: string, userId: string): Promise<UserResponseDto> {
    // Check if household exists
    const household = await this.householdRepository.findById(householdId);
    if (!household) {
      throw new NotFoundError('Household not found');
    }

    // Check if user is a member of this household
    const isMember = await this.householdRepository.isMember(householdId, userId);
    if (!isMember) {
      throw new UnauthorizedError('Access denied. You are not a member of this household.');
    }

    // Update user's selected household
    await this.userRepository.update(userId, { 
      selectedHouseholdId: householdId 
    });

    // Return updated user
    const updatedUser = await this.userRepository.findById(userId);
    return this.transformToUserResponseDto(updatedUser);
  }

  private validateCreateHouseholdDto(dto: CreateHouseholdDto): void {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Household name is required');
    }

    if (dto.name.trim().length > 100) {
      throw new ValidationError('Household name must be 100 characters or less');
    }

    if (dto.description && dto.description.length > 500) {
      throw new ValidationError('Description must be 500 characters or less');
    }
  }

  private validateUpdateHouseholdDto(dto: UpdateHouseholdDto): void {
    if (dto.name !== undefined && (!dto.name || dto.name.trim().length === 0)) {
      throw new ValidationError('Household name cannot be empty');
    }

    if (dto.name && dto.name.trim().length > 100) {
      throw new ValidationError('Household name must be 100 characters or less');
    }

    if (dto.description && dto.description.length > 500) {
      throw new ValidationError('Description must be 500 characters or less');
    }
  }

  private validateJoinHouseholdDto(dto: JoinHouseholdDto): void {
    if (!dto.inviteCode || dto.inviteCode.trim().length === 0) {
      throw new ValidationError('Invite code is required');
    }

    if (dto.inviteCode.trim().length !== 8) {
      throw new ValidationError('Invite code must be 8 characters long');
    }
  }

  // Static utility methods for DTO transformations that can be used by controllers
  static transformToResponseDto(household: any): HouseholdResponseDto {
    return {
      id: household.id,
      name: household.name,
      description: household.description,
      inviteCode: household.inviteCode,
      memberCount: household.memberCount || 0,
      userRole: household.userRole || 'member',
      createdAt: household.createdAt,
      updatedAt: household.updatedAt
    };
  }

  static transformToDetailResponseDto(household: any): HouseholdDetailResponseDto {
    return {
      id: household.id,
      name: household.name,
      description: household.description,
      inviteCode: household.inviteCode,
      memberCount: household.memberCount || 0,
      members: household.members,
      creator: household.creator,
      userRole: household.userRole || 'member',
      createdAt: household.createdAt,
      updatedAt: household.updatedAt
    };
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