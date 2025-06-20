import { Household, HouseholdMember, User } from '../models';

export interface FindOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CreateHouseholdData {
  name: string;
  description?: string;
  createdBy: string;
}

export class HouseholdRepository {
  
  async findById(id: string): Promise<any> {
    return await Household.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          through: {
            where: { isActive: true },
            attributes: ['role', 'createdAt'],
          },
        }
      ]
    });
  }

  async findByUserId(userId: string, options: FindOptions = {}): Promise<any[]> {
    const memberships = await HouseholdMember.findAll({
      where: {
        userId: userId,
        isActive: true,
      },
      include: [
        {
          model: Household,
          as: 'household',
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
        },
      ],
      limit: options.limit,
      offset: options.offset,
      order: options.sortBy ? [[
        { model: Household, as: 'household' }, 
        options.sortBy, 
        options.sortOrder || 'DESC'
      ]] : undefined,
    });

    // Add member count to each household
    const householdsWithCounts = await Promise.all(
      memberships.map(async (membership) => {
        const memberCount = await this.getMemberCount(membership.household.id);
        return {
          ...membership.household.toJSON(),
          memberCount,
          userRole: membership.role
        };
      })
    );

    return householdsWithCounts;
  }

  async create(data: CreateHouseholdData): Promise<any> {
    return await Household.create({
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
    });
  }

  async addMember(householdId: string, userId: string, role: string = 'member'): Promise<any> {
    return await HouseholdMember.create({
      householdId,
      userId,
      role: role as 'admin' | 'member',
      isActive: true,
    });
  }

  async isMember(householdId: string, userId: string): Promise<boolean> {
    const membership = await HouseholdMember.findOne({
      where: {
        householdId,
        userId,
        isActive: true,
      },
    });
    return !!membership;
  }

  async isAdmin(householdId: string, userId: string): Promise<boolean> {
    const membership = await HouseholdMember.findOne({
      where: {
        householdId,
        userId,
        role: 'admin',
        isActive: true,
      },
    });
    return !!membership;
  }

  async getMemberCount(householdId: string): Promise<number> {
    return await HouseholdMember.count({
      where: {
        householdId,
        isActive: true,
      },
    });
  }

  async getAdminCount(householdId: string): Promise<number> {
    return await HouseholdMember.count({
      where: {
        householdId,
        role: 'admin',
        isActive: true,
      },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return await HouseholdMember.count({
      where: {
        userId,
        isActive: true,
      },
    });
  }

  async update(id: string, data: Partial<CreateHouseholdData>): Promise<[number]> {
    return await Household.update(data, {
      where: { id }
    });
  }

  async delete(id: string): Promise<number> {
    return await Household.destroy({
      where: { id }
    });
  }

  async removeMember(householdId: string, userId: string): Promise<void> {
    await HouseholdMember.update(
      { isActive: false },
      {
        where: {
          householdId,
          userId,
          isActive: true,
        },
      }
    );
  }

  async findByInviteCode(inviteCode: string): Promise<any> {
    return await Household.findOne({
      where: { inviteCode },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        }
      ]
    });
  }
} 