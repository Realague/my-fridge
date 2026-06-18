export const getUserInitials = (
  firstName?: string | null,
  lastName?: string | null,
  email?: string | null,
): string => {
  const first = (firstName ?? '').trim();
  const last = (lastName ?? '').trim();
  if (first || last) {
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || '?';
  }
  const fallback = (email ?? '').trim();
  return fallback ? fallback.charAt(0).toUpperCase() : '?';
};

export const getHouseholdInitials = (name?: string | null): string => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
};
