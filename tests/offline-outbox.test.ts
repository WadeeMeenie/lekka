import { beforeEach, describe, expect, it, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { enqueuePostDraft, listPendingPostDrafts, syncPendingPostDrafts } from "../lib/offline-outbox";

const repository = vi.hoisted(() => ({ createPost: vi.fn(), uploadMedia: vi.fn(), attachPostMedia: vi.fn() }));
vi.mock("@/lib/supabase-repository", () => repository);
const draft = { ownerId: "user-a", kind: "post" as const, body: "A local update", area: "Cape Town", visibility: "public" as const };

beforeEach(async () => {
  await AsyncStorage.clear();
  vi.resetAllMocks();
  repository.createPost.mockResolvedValue({ data: { id: "post-1" }, error: null });
});

describe("offline draft concurrency", () => {
  it("preserves both drafts when enqueued concurrently", async () => {
    await Promise.all([enqueuePostDraft(draft), enqueuePostDraft({ ...draft, body: "Another update" })]);
    expect(await listPendingPostDrafts(draft.ownerId)).toHaveLength(2);
  });

  it("does not publish a draft twice when two screens start sync", async () => {
    await enqueuePostDraft(draft);
    await Promise.all([syncPendingPostDrafts(draft.ownerId), syncPendingPostDrafts(draft.ownerId)]);
    expect(repository.createPost).toHaveBeenCalledTimes(1);
    expect(await listPendingPostDrafts(draft.ownerId)).toHaveLength(0);
  });

  it("retains a new draft queued while an older draft is publishing", async () => {
    await enqueuePostDraft(draft);
    let finish!: (value: unknown) => void;
    repository.createPost.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const syncing = syncPendingPostDrafts(draft.ownerId);
    await vi.waitFor(() => expect(repository.createPost).toHaveBeenCalledTimes(1));
    const adding = enqueuePostDraft({ ...draft, body: "New draft" });
    finish({ data: { id: "post-1" }, error: null });
    await Promise.all([syncing, adding]);
    expect((await listPendingPostDrafts(draft.ownerId)).map((item) => item.body)).toEqual(["New draft"]);
  });

  it("keeps failed drafts and allows the next sync to retry", async () => {
    await enqueuePostDraft(draft);
    repository.createPost.mockRejectedValueOnce(new Error("Offline"));
    expect(await syncPendingPostDrafts(draft.ownerId)).toEqual({ synced: 0, remaining: 1 });
    expect(await syncPendingPostDrafts(draft.ownerId)).toEqual({ synced: 1, remaining: 0 });
  });

  it("retries attachment without recreating the post or uploading the same object again", async () => {
    await enqueuePostDraft({ ...draft, mediaUri: "file:///photo.jpg" });
    repository.uploadMedia.mockResolvedValue({ error: null });
    repository.attachPostMedia.mockResolvedValueOnce({ error: new Error("Connection lost") }).mockResolvedValueOnce({ error: null });
    expect(await syncPendingPostDrafts(draft.ownerId)).toEqual({ synced: 0, remaining: 1 });
    expect(await syncPendingPostDrafts(draft.ownerId)).toEqual({ synced: 1, remaining: 0 });
    expect(repository.createPost).toHaveBeenCalledTimes(1);
    expect(repository.uploadMedia).toHaveBeenCalledTimes(1);
    expect(repository.attachPostMedia).toHaveBeenCalledTimes(2);
  });
});
