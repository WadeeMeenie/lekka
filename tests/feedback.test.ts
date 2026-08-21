import { describe, expect, it } from "vitest";

import {
  FEEDBACK_DESCRIPTION_LIMIT,
  FEEDBACK_TITLE_LIMIT,
  validateFeedbackSubmission,
} from "../lib/feedback";

describe("validateFeedbackSubmission", () => {
  const validInput = {
    type: "bug_report" as const,
    title: "Photo post is slow on mobile data",
    description: "The upload stays on the photo step for several minutes.",
    appVersion: "1.0.0",
  };

  it("trims valid feedback before submitting it", () => {
    expect(validateFeedbackSubmission({ ...validInput, title: "  Useful feedback  ", description: "  Details here.  " })).toEqual({
      data: { ...validInput, title: "Useful feedback", description: "Details here." },
      error: null,
    });
  });

  it("requires a title and supporting details", () => {
    expect(validateFeedbackSubmission({ ...validInput, title: " " }).error).toMatch(/short title/i);
    expect(validateFeedbackSubmission({ ...validInput, description: " " }).error).toMatch(/little more/i);
  });

  it("enforces the beta feedback length limits", () => {
    expect(validateFeedbackSubmission({ ...validInput, title: "a".repeat(FEEDBACK_TITLE_LIMIT + 1) }).error).toMatch(/120/);
    expect(validateFeedbackSubmission({ ...validInput, description: "a".repeat(FEEDBACK_DESCRIPTION_LIMIT + 1) }).error).toMatch(/1000/);
  });
});
