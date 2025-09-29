export interface CreateHouseholdDto {
  name: string;
  description?: string;
  storageAreas?: Array<{
    name: string;
    description?: string;
    emoji: string;
    type: 'fridge' | 'freezer' | 'pantry' | 'kitchen_cupboard' | 'other';
  }>;
}

export interface UpdateHouseholdDto {
  name?: string;
  description?: string;
}

export interface HouseholdQueryDto {
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'createdAt' | 'memberCount';
  sortOrder?: 'ASC' | 'DESC';
  search?: string;
}

export interface HouseholdResponseDto {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  memberCount: number;
  userRole: 'admin' | 'member';
  createdAt: Date;
  updatedAt: Date;
}

export interface HouseholdDetailResponseDto extends HouseholdResponseDto {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: 'admin' | 'member';
    joinedAt: Date;
  }>;
}

export interface JoinHouseholdDto {
  inviteCode: string;
}

export interface SetSelectedHouseholdDto {
  householdId: string;
} 