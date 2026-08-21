export const FEEDBACK_TYPES = ["bug_report", "feature_request"] as const;

export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackSubmission = {
  type: FeedbackType;
  title: string;
  description: string;
  appVersion: string;
};

export type FeedbackValidation =
  | { data: FeedbackSubmission; error: null }
  | { data: null; error: string };

export const FEEDBACK_TITLE_LIMIT = 120;
export const FEEDBACK_DESCRIPTION_LIMIT = 1000;

export function validateFeedbackSubmission(input: FeedbackSubmission): FeedbackValidation {
  if (!FEEDBACK_TYPES.includes(input.type)) {
    return { data: null, error: "Choose whether this is a bug report or a feature request." };
  }

  const title = input.title.trim();
  const description = input.description.trim();
  const appVersion = input.appVersion.trim() || "unknown";

  if (!title) return { data: null, error: "Add a short title so we can understand the feedback." };
  if (title.length > FEEDBACK_TITLE_LIMIT) return { data: null, error: `Keep the title to ${FEEDBACK_TITLE_LIMIT} characters or fewer.` };
  if (!description) return { data: null, error: "Tell us a little more about what happened or what would help." };
  if (description.length > FEEDBACK_DESCRIPTION_LIMIT) return { data: null, error: `Keep the details to ${FEEDBACK_DESCRIPTION_LIMIT} characters or fewer.` };
  if (appVersion.length > 64) return { data: null, error: "The app version could not be recorded. Please restart Lekka and try again." };

  return { data: { type: input.type, title, description, appVersion }, error: null };
}
