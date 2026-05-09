import { PushSubscription } from '../models/PushSubscription';

interface UpsertSubscriptionInput {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}

export class PushSubscriptionRepository {
  async findByUserId(userId: string): Promise<PushSubscription[]> {
    return await PushSubscription.findAll({ where: { userId } });
  }

  async findByUserIds(userIds: string[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) return [];
    return await PushSubscription.findAll({ where: { userId: userIds } });
  }

  async upsertByEndpoint(input: UpsertSubscriptionInput): Promise<PushSubscription> {
    const existing = await PushSubscription.findOne({ where: { endpoint: input.endpoint } });
    if (existing) {
      await existing.update({
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent ?? null,
        lastSeenAt: new Date(),
      });
      return existing;
    }
    return await PushSubscription.create({
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      lastSeenAt: new Date(),
    });
  }

  async deleteByEndpoint(endpoint: string): Promise<number> {
    return await PushSubscription.destroy({ where: { endpoint } });
  }

  async deleteByEndpointForUser(userId: string, endpoint: string): Promise<number> {
    return await PushSubscription.destroy({ where: { userId, endpoint } });
  }

  async deleteById(id: string): Promise<number> {
    return await PushSubscription.destroy({ where: { id } });
  }
}
