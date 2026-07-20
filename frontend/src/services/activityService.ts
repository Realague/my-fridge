import { makeAuthenticatedApiCall } from '@/utils/apiAuth';
import { HouseholdActivityAction, HouseholdActivityTargetType } from '@/types/enums';

// Les services front définissent ApiResponse en local (cf. stockExitService.ts),
// pas d'import partagé.
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface ActivityActor {
  id: string;
  name: string | null; // null when the backend has no name for the author; the frontend localizes a fallback
  isFormerMember: boolean;
}

export interface ActivityEntry {
  id: string;
  action: HouseholdActivityAction;
  targetType: HouseholdActivityTargetType | null;
  targetId: string | null;
  itemNameSnapshot: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: ActivityActor;
}

export interface ActivityFeedResponse {
  entries: ActivityEntry[];
  nextCursor: string | null;
}

const createApiService = () => {
  const makeApiCall = async (
    url: string,
    options: { method?: 'GET' | 'POST'; body?: any } = {}
  ) => {
    const response = await makeAuthenticatedApiCall(url, options, { showToast: false });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    return response;
  };
  return {
    get: (url: string) => makeApiCall(url, { method: 'GET' }),
  };
};

const apiService = createApiService();

const getFeed = async (params: {
  householdId: string;
  limit?: number;
  before?: string;
}): Promise<ActivityFeedResponse> => {
  const qs = new URLSearchParams();
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.before) qs.set('before', params.before);
  const response = await apiService.get(
    `/api/households/${params.householdId}/activities?${qs.toString()}`
  );
  const result: ApiResponse<ActivityFeedResponse> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load activities');
  return result.data!;
};

const getRecent = async (householdId: string, limit = 5): Promise<ActivityEntry[]> => {
  const response = await apiService.get(
    `/api/households/${householdId}/activities/recent?limit=${limit}`
  );
  const result: ApiResponse<{ entries: ActivityEntry[] }> = await response.json();
  if (!result.success) throw new Error(result.error || 'Failed to load recent activities');
  return result.data!.entries;
};

export const activityService = { getFeed, getRecent };
