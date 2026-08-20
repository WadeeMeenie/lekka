import { describe, expect, it } from "vitest";

import { getFetchPresentation } from "../lib/loading-state";

describe("fetch loading presentation", () => {
  it("uses a skeleton only when the initial fetch has no data", () => {
    expect(getFetchPresentation({ isInitialLoading: true, isRefreshing: false, hasData: false })).toBe("skeleton");
    expect(getFetchPresentation({ isInitialLoading: true, isRefreshing: false, hasData: true })).toBe("content");
  });

  it("keeps cached content visible during a background refresh", () => {
    expect(getFetchPresentation({ isInitialLoading: false, isRefreshing: true, hasData: true })).toBe("content-refreshing");
  });

  it("falls back to content or an empty state after loading finishes", () => {
    expect(getFetchPresentation({ isInitialLoading: false, isRefreshing: false, hasData: false })).toBe("content");
  });
});
