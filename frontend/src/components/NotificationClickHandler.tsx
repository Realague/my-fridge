import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useHouseholdStore } from '@/stores/householdStore';
import { useExpirationNotificationStore } from '@/stores/expirationNotificationStore';

export const NotificationClickHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const householdId = useHouseholdStore((s) => s.selectedHouseholdId);
  const markRead = useExpirationNotificationStore((s) => s.markRead);
  const handledIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const notificationId = params.get('notificationId');
    if (!notificationId) return;
    if (handledIds.current.has(notificationId)) return;
    if (!isAuthenticated || !householdId) return;

    handledIds.current.add(notificationId);

    params.delete('notificationId');
    const cleanedSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: cleanedSearch ? `?${cleanedSearch}` : '' },
      { replace: true }
    );

    void markRead(householdId, notificationId);
  }, [location.pathname, location.search, isAuthenticated, householdId, navigate, markRead]);

  return null;
};
