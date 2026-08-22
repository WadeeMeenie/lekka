import { describe, expect, it } from "vitest";

import { businessTypeLabel, validateBusinessProfile, validatePersonalIdentity } from "../lib/account";
import { isOAuthProviderFlagEnabled } from "../lib/oauth-config";
import { validateBusinessInvite } from "../lib/business-invitation-validation";
import { clampDateParts, daysInMonth, formatDateParts, parseDateParts } from "../lib/date-of-birth";
import { getPersonalDetailsSaveMessage } from "../lib/account-errors";

describe("smart account validation", () => {
  const validPersonal = { firstName: "Wade", surname: "Meenie", dateOfBirth: "1990-05-12", gender: null } as const;
  const validBusiness = { name: "Signworx", category: "Retail", description: "Local signage", area: "Bellville", address: "", phone: "", email: "", website: "", businessType: "Family-owned", locationMode: "physical" as const, serviceAreas: [], openingHours: "Mon–Fri 08:00–17:00" };

  it("accepts a valid adult personal identity and leaves gender optional", () => {
    expect(validatePersonalIdentity(validPersonal)).toEqual({ data: validPersonal, error: null });
  });

  it("rejects impossible, future, or underage dates of birth", () => {
    expect(validatePersonalIdentity({ ...validPersonal, dateOfBirth: "2040-01-01" }).error).toMatch(/real date/i);
    expect(validatePersonalIdentity({ ...validPersonal, dateOfBirth: "2020-01-01" }).error).toMatch(/age 13/i);
    expect(validatePersonalIdentity({ ...validPersonal, dateOfBirth: "1880-01-01" }).error).toMatch(/real date/i);
  });

  it("requires a service area for mobile businesses and validates business contact details", () => {
    expect(validateBusinessProfile({ ...validBusiness, locationMode: "service", serviceAreas: [] }).error).toMatch(/service area/i);
    expect(validateBusinessProfile({ ...validBusiness, email: "invalid" }).error).toMatch(/valid business email/i);
    expect(validateBusinessProfile({ ...validBusiness, website: "example.co.za" }).error).toMatch(/https/i);
    expect(validateBusinessProfile({ ...validBusiness, locationMode: "service", serviceAreas: ["Bellville"] }).error).toBeNull();
  });

  it("documents the active location mode in user-facing language", () => {
    expect(businessTypeLabel("both")).toMatch(/location and travel/i);
  });
});

describe("provider configuration flags", () => {
  it("only enables provider buttons after an explicit public build flag", () => {
    expect(isOAuthProviderFlagEnabled(undefined)).toBe(false);
    expect(isOAuthProviderFlagEnabled("false")).toBe(false);
    expect(isOAuthProviderFlagEnabled("true")).toBe(true);
  });
});

describe("date-of-birth selectors", () => {
  it("round-trips separate date parts into the stored date format", () => {
    const parts = parseDateParts("1991-02-05");
    expect(parts).toEqual({ year: 1991, month: 2, day: 5 });
    expect(formatDateParts(parts)).toBe("1991-02-05");
  });

  it("limits days to the selected month and leap year", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2023, 2)).toBe(28);
    expect(clampDateParts({ year: 2023, month: 2, day: 31 })).toEqual({ year: 2023, month: 2, day: 28 });
  });
});

describe("personal-details error messaging", () => {
  it("hides raw RLS details from users", () => {
    expect(getPersonalDetailsSaveMessage(new Error("new row violates row-level security policy for table profiles"))).toMatch(/couldn’t save your personal details/i);
  });
});

describe("business invitation validation", () => {
  it("normalizes an invited email and permits only admin or staff roles", () => {
    expect(validateBusinessInvite(" Team@Example.com ", "admin")).toEqual({ data: { email: "team@example.com", role: "admin" }, error: null });
    expect(validateBusinessInvite("invalid", "staff").error).toMatch(/valid email/i);
  });
});
