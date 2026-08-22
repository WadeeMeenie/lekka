export function canManageCommunityMember(ownerId: string | number | null | undefined, currentUserId: string | number | null | undefined, targetUserId: string | number | null | undefined) {
  return ownerId != null && currentUserId != null && targetUserId != null && String(ownerId) === String(currentUserId) && String(targetUserId) !== String(currentUserId);
}

export function getCommunityMemberRoleLabel(isModerator: boolean) {
  return isModerator ? "Moderator" : "Member";
}
