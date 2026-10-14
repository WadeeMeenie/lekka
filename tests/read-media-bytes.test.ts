import { afterEach, describe, expect, it, vi } from "vitest";
import { readMediaBytes } from "../lib/read-media-bytes";
const state = vi.hoisted(() => ({ platform: { OS: "web" }, bytes: vi.fn() }));
vi.mock("react-native", () => ({ Platform: state.platform }));
vi.mock("expo-file-system", () => ({ File: class { bytes = state.bytes; } }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); state.platform.OS = "web"; });

describe("selected media bytes", () => {
  it("reads browser picker data without invoking the unsupported native file API", async () => {
    expect(await readMediaBytes("data:image/png;base64,AQID")).toEqual(new Uint8Array([1, 2, 3]));
    expect(state.bytes).not.toHaveBeenCalled();
  });
  it("surfaces unreadable browser media instead of uploading an error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Not found", { status: 404 })));
    await expect(readMediaBytes("blob:expired")).rejects.toThrow("choose it again");
  });
  it("retains the native file API on Android and iOS", async () => {
    state.platform.OS = "android";
    state.bytes.mockResolvedValue(new Uint8Array([4, 5]));
    expect(await readMediaBytes("file:///photo.jpg")).toEqual(new Uint8Array([4, 5]));
  });
});
