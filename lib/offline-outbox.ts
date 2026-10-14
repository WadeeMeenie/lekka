import AsyncStorage from "@react-native-async-storage/async-storage";
import { attachPostMedia, createPost, uploadMedia } from "@/lib/supabase-repository";
import type { DeviceLocation } from "@/lib/location";
import type { RadarCategory, PostKind } from "@/lib/local-radar";

export type PendingPostDraft = {
  id: string;
  ownerId: string;
  kind: PostKind;
  category?: RadarCategory;
  title?: string;
  body: string;
  area: string;
  visibility: "nearby" | "public";
  location?: DeviceLocation;
  businessId?: string;
  createdAt: number;
  mediaUri?: string;
  mediaType?: string;
  mediaWidth?: number;
  mediaHeight?: number;
  postId?: string;
  storagePath?: string;
  mediaUploaded?: boolean;
  attempts?: number;
  lastError?: string;
};

const keyFor = (ownerId: string) => `lekka/outbox/posts/${ownerId}/v1`;

// Home and Create can sync at the same time. Serialize every read/modify/write
// for an owner so a completed sync cannot overwrite a newly queued draft.
const ownerOperations = new Map<string, Promise<void>>();

function withOwnerLock<T>(ownerId: string, operation: () => Promise<T>): Promise<T> {
  const previous = ownerOperations.get(ownerId) ?? Promise.resolve();
  const result = previous.then(operation);
  const settled = result.then(() => undefined, () => undefined);
  ownerOperations.set(ownerId, settled);
  void settled.then(() => {
    if (ownerOperations.get(ownerId) === settled) ownerOperations.delete(ownerId);
  });
  return result;
}

export async function listPendingPostDrafts(ownerId: string) {
  const raw = await AsyncStorage.getItem(keyFor(ownerId));
  if (!raw) return [] as PendingPostDraft[];
  try { return JSON.parse(raw) as PendingPostDraft[]; } catch { return []; }
}

export async function enqueuePostDraft(draft: Omit<PendingPostDraft, "id" | "createdAt">) {
  return withOwnerLock(draft.ownerId, async () => {
  const current = await listPendingPostDrafts(draft.ownerId);
  const next: PendingPostDraft = { ...draft, id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), attempts: 0 };
  await AsyncStorage.setItem(keyFor(draft.ownerId), JSON.stringify([next, ...current]));
  return next;
  });
}

export async function syncPendingPostDrafts(ownerId: string) {
  return withOwnerLock(ownerId, async () => {
  const current = await listPendingPostDrafts(ownerId);
  const remaining: PendingPostDraft[] = [];
  for (const draft of current) {
    let postId = draft.postId;
    let storagePath = draft.storagePath;
    let mediaUploaded = draft.mediaUploaded ?? false;
    try {
      if (!postId) {
        const result = await createPost(draft);
        if (result.error || !result.data?.id) { remaining.push({ ...draft, attempts: (draft.attempts ?? 0) + 1, lastError: result.error?.message ?? "Post creation failed" }); continue; }
        postId = result.data.id;
      }
      if (draft.mediaUri && postId) {
        storagePath = storagePath ?? `${ownerId}/${postId}/primary-media`;
        if (!mediaUploaded) {
          const upload = await uploadMedia(draft.mediaUri, storagePath, draft.mediaType ?? "image/jpeg");
          if (upload.error) throw upload.error;
          mediaUploaded = true;
        }
        const attached = await attachPostMedia({ postId, storagePath, mediaType: "image", width: draft.mediaWidth, height: draft.mediaHeight });
        if (attached.error) throw attached.error;
      }
    } catch (error) {
      remaining.push({ ...draft, postId, storagePath, mediaUploaded, attempts: (draft.attempts ?? 0) + 1, lastError: error instanceof Error ? error.message : "Sync failed" });
      continue;
    }
  }
  await AsyncStorage.setItem(keyFor(ownerId), JSON.stringify(remaining));
  return { synced: current.length - remaining.length, remaining: remaining.length };
  });
}

export async function clearPendingPostDrafts(ownerId: string) {
  await withOwnerLock(ownerId, () => AsyncStorage.removeItem(keyFor(ownerId)));
}
