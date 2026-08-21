import { describe, expect, it } from "vitest";

import { getMediaUploadPresentation, isRetryableMediaStage } from "../lib/media-upload-state";

describe("media upload presentation", () => {
  it("progresses through the upload stages with user-facing copy", () => {
    expect(getMediaUploadPresentation("creating-post").progress).toBeLessThan(getMediaUploadPresentation("uploading-media").progress);
    expect(getMediaUploadPresentation("uploading-media").label).toBe("Uploading your photo");
    expect(getMediaUploadPresentation("attaching-media").label).toBe("Finishing the photo");
  });

  it("marks queued and failed work as retryable", () => {
    expect(isRetryableMediaStage("queued")).toBe(true);
    expect(isRetryableMediaStage("error")).toBe(true);
    expect(isRetryableMediaStage("published")).toBe(false);
  });

  it("describes a safe offline outcome without pretending it published", () => {
    const queued = getMediaUploadPresentation("queued");
    expect(queued.tone).toBe("warning");
    expect(queued.detail).toContain("retry");
  });
});
