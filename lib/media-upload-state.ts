export type MediaUploadStage =
  | "idle"
  | "locating"
  | "creating-post"
  | "uploading-media"
  | "attaching-media"
  | "queued"
  | "published"
  | "error";

export type MediaUploadPresentation = {
  label: string;
  detail: string;
  progress: number;
  tone: "neutral" | "active" | "success" | "warning" | "error";
};

export function getMediaUploadPresentation(stage: MediaUploadStage): MediaUploadPresentation {
  switch (stage) {
    case "locating":
      return { label: "Finding your area", detail: "Keeping the post location-private and local.", progress: 0.16, tone: "active" };
    case "creating-post":
      return { label: "Saving your post", detail: "Your text is being sent to Lekka.", progress: 0.34, tone: "active" };
    case "uploading-media":
      return { label: "Uploading your photo", detail: "Keep Lekka open while the image finishes.", progress: 0.62, tone: "active" };
    case "attaching-media":
      return { label: "Finishing the photo", detail: "Linking the photo to your post.", progress: 0.82, tone: "active" };
    case "queued":
      return { label: "Saved for retry", detail: "Your post is safe on this device and will retry when you reconnect.", progress: 0.72, tone: "warning" };
    case "published":
      return { label: "Published", detail: "Your local update is now visible.", progress: 1, tone: "success" };
    case "error":
      return { label: "Couldn’t finish yet", detail: "Your draft is still available. Check your connection and try again.", progress: 0.38, tone: "error" };
    default:
      return { label: "Ready to publish", detail: "Your update will appear around your selected area.", progress: 0, tone: "neutral" };
  }
}

export function isRetryableMediaStage(stage: MediaUploadStage) {
  return stage === "queued" || stage === "error";
}
