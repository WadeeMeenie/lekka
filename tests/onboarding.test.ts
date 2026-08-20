import { describe, expect, it } from "vitest";

import { radiusToMeters, toggleInterest } from "../lib/onboarding";

describe("Lekka onboarding preferences", () => {
  it("toggles interests without mutating the existing selection", () => {
    const selected = ["Food & Drink"];
    expect(toggleInterest(selected, "Events")).toEqual(["Food & Drink", "Events"]);
    expect(toggleInterest(selected, "Food & Drink")).toEqual([]);
    expect(selected).toEqual(["Food & Drink"]);
  });

  it("maps user-facing radius labels to backend meters", () => {
    expect(radiusToMeters("500 m")).toBe(500);
    expect(radiusToMeters("1 km")).toBe(1000);
    expect(radiusToMeters("5 km")).toBe(5000);
    expect(radiusToMeters("10 km")).toBe(10000);
    expect(radiusToMeters("City")).toBe(25000);
  });
});
