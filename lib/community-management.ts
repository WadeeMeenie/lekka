export function canManageCommunityMember(ownerId: string | number | null | undefined, currentUserId: string | number | null | undefined, targetUserId: string | number | null | undefined) {
  return ownerId != null && currentUserId != null && targetUserId != null && String(ownerId) === String(currentUserId) && String(targetUserId) !== String(currentUserId);
}

export function getCommunityMemberRoleLabel(isModerator: boolean) {
  return isModerator ? "Moderator" : "Member";
}

export function canModerateCommunityContent(ownerId: string | number | null | undefined, currentUserId: string | number | null | undefined, isModerator: boolean) {
  return Boolean(currentUserId != null && ((ownerId != null && String(ownerId) === String(currentUserId)) || isModerator));
}

export type CommunitySettingsInput = { name: string; description: string; visibility: "public" | "private"; rules: string[] };

export function validateCommunitySettings(input: CommunitySettingsInput) {
  const name = input.name.trim();
  const description = input.description.trim();
  const rules = input.rules.map((rule) => rule.trim()).filter(Boolean).slice(0, 12);
  if (name.length < 3 || name.length > 80) return { valid: false, error: "Community name must be between 3 and 80 characters" };
  if (description.length > 500) return { valid: false, error: "Description must be 500 characters or fewer" };
  if (rules.some((rule) => rule.length > 200)) return { valid: false, error: "Each guideline must be 200 characters or fewer" };
  return { valid: true, value: { name, description, visibility: input.visibility, rules } };
}
