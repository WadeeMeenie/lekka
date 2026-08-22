import { describe, expect, it } from "vitest";

import { asyncErrorMessage, classifyAsyncError, isRetryableAsyncError } from "../lib/async-error";

describe("async error presentation", () => {
  it("classifies network and timeout failures", () => {
    expect(classifyAsyncError(new Error("Failed to fetch"))).toBe("offline");
    expect(classifyAsyncError(new Error("request timed out"))).toBe("timeout");
    expect(isRetryableAsyncError(new Error("request timed out"))).toBe(true);
  });

  it("classifies authorization and validation failures without exposing backend text", () => {
    expect(classifyAsyncError({ status: 401, message: "jwt expired" })).toBe("auth");
    expect(classifyAsyncError({ status: 422, message: "invalid username" })).toBe("validation");
    expect(asyncErrorMessage({ status: 401, message: "secret backend detail" })).toContain("Sign in again");
    expect(asyncErrorMessage({ status: 422, message: "secret backend detail" })).not.toContain("secret backend detail");
  });

  it("provides safe server and fallback messages", () => {
    expect(asyncErrorMessage({ status: 503 })).toContain("temporarily unavailable");
    expect(asyncErrorMessage(new Error("unexpected"), "Try later")).toBe("Try later");
  });
});
