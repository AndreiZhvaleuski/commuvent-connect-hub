export function dicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}`;
}

export function userAvatarUrl(profile: { id?: string | null; avatar_url?: string | null } | null | undefined, fallbackId?: string | null): string | undefined {
  if (profile?.avatar_url) return profile.avatar_url;
  const id = profile?.id ?? fallbackId;
  return id ? dicebearAvatarUrl(id) : undefined;
}
