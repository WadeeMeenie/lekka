export const DISPLAY_NAME_MAX_LENGTH = 60;
export const BIO_MAX_LENGTH = 160;

export type ProfileFieldErrors = {
  displayName?: string;
  bio?: string;
};

export function validateProfileFields(displayName: string, bio: string): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};
  const name = displayName.trim();
  const shortBio = bio.trim();
  if (!name) errors.displayName = "Add a display name so people know who they are connecting with.";
  else if (name.length > DISPLAY_NAME_MAX_LENGTH) errors.displayName = `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`;
  if (shortBio.length > BIO_MAX_LENGTH) errors.bio = `Bio must be ${BIO_MAX_LENGTH} characters or fewer.`;
  return errors;
}
