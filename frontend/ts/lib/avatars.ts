export function initialsAvatarUrl(name: string): string {
  const seed = encodeURIComponent(name.trim());
  return `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=b6e3f4|c0aede|ffd5dc&fontWeight=500`;
}