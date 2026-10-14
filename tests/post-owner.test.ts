import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPost } from "../lib/supabase-repository";
const client = vi.hoisted(() => ({ getUser: vi.fn(), insert: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ isSupabaseConfigured: true, supabase: { auth: { getUser: client.getUser }, from: client.from } }));
vi.mock("@/lib/read-media-bytes", () => ({ readMediaBytes: vi.fn() }));
vi.mock("@/lib/local-radar", () => ({ discoveryRadiusToMeters: vi.fn(), loadPosts: vi.fn(), loadSettings: vi.fn(), savePosts: vi.fn() }));
const draft = { ownerId: "owner-a", kind: "post" as const, body: "Private draft", area: "Cape Town", visibility: "public" as const };
beforeEach(() => {
  vi.resetAllMocks();
  client.from.mockReturnValue({ insert: client.insert });
  client.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "post-1" }, error: null }) }) });
});
describe("post author binding", () => {
  it("does not publish a saved draft under a different signed-in account", async () => {
    client.getUser.mockResolvedValue({ data: { user: { id: "owner-b" } } });
    expect((await createPost(draft)).error).toBeTruthy();
    expect(client.insert).not.toHaveBeenCalled();
  });
  it("publishes when the draft owner matches the authenticated user", async () => {
    client.getUser.mockResolvedValue({ data: { user: { id: "owner-a" } } });
    expect((await createPost(draft)).error).toBeNull();
    expect(client.insert).toHaveBeenCalledWith(expect.objectContaining({ author_id: "owner-a" }));
  });
  it("rejects a signed-out publication", async () => {
    client.getUser.mockResolvedValue({ data: { user: null } });
    expect((await createPost(draft)).error).toBeTruthy();
    expect(client.insert).not.toHaveBeenCalled();
  });
});
