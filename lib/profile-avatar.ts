export const PROFILE_AVATAR_UPDATED_MESSAGE = "Profile picture updated successfully.";

export function createProfileAvatarPath(userId: string, timestamp = Date.now()) {
  return `${userId}/profile/avatar-${timestamp}.jpg`;
}

export function getAvatarInitials(displayName?: string | null, fallback = "LM") {
  const normalized = displayName?.trim();
  return (normalized || fallback).slice(0, 2).toUpperCase();
}
