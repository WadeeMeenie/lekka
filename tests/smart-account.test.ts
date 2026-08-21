import { describe, expect, it } from "vitest";

import { businessTypeLabel, validateBusinessProfile, validatePersonalIdentity } from "../lib/account";
import { isOAuthProviderFlagEnabled } from "../lib/oauth-config";
import { validateBusinessInvite } from "../lib/business-invitation-validation";

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

describe("business invitation validation", () => {
  it("normalizes an invited email and permits only admin or staff roles", () => {
    expect(validateBusinessInvite(" Team@Example.com ", "admin")).toEqual({ data: { email: "team@example.com", role: "admin" }, error: null });
    expect(validateBusinessInvite("invalid", "staff").error).toMatch(/valid email/i);
  });
});
