export const ACCOUNT_INTENTS = ["personal", "business"] as const;
export const GENDER_OPTIONS = ["male", "female", "prefer_not_to_say"] as const;
export const BUSINESS_LOCATION_MODES = ["physical", "service", "both"] as const;

export type AccountIntent = (typeof ACCOUNT_INTENTS)[number];
export type Gender = (typeof GENDER_OPTIONS)[number];
export type BusinessLocationMode = (typeof BUSINESS_LOCATION_MODES)[number];

export const BUSINESS_CATEGORIES = [
  "Retail", "Restaurant", "Takeaway", "Professional service", "Contractor", "Beauty", "Health & fitness",
  "Automotive", "Accommodation", "Entertainment", "Events", "Trades", "Construction", "Transport", "Education", "Other",
] as const;

export type PersonalIdentityInput = { firstName: string; surname: string; dateOfBirth: string; gender: Gender | null };
export type BusinessProfileInput = {
  name: string; category: string; description: string; area: string; address: string; phone: string; email: string;
  website: string; businessType: string; locationMode: BusinessLocationMode; serviceAreas: string[]; openingHours: string;
  latitude?: number | null; longitude?: number | null;
};

export function validatePersonalIdentity(input: PersonalIdentityInput) {
  const firstName = input.firstName.trim();
  const surname = input.surname.trim();
  if (!firstName || !surname) return { data: null, error: "Add your first name and surname to continue." };
  if (firstName.length > 80 || surname.length > 80) return { data: null, error: "Keep each name to 80 characters or fewer." };
  const dob = new Date(`${input.dateOfBirth}T00:00:00`);
  const today = new Date();
  const earliest = new Date("1900-01-01T00:00:00");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth) || Number.isNaN(dob.getTime()) || dob > today || dob < earliest) return { data: null, error: "Enter a real date of birth in YYYY-MM-DD format." };
  const age = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
  if (age < 13) return { data: null, error: "Lekka accounts are available from age 13." };
  return { data: { firstName, surname, dateOfBirth: input.dateOfBirth, gender: input.gender }, error: null };
}

export function validateBusinessProfile(input: BusinessProfileInput) {
  const name = input.name.trim();
  const category = input.category.trim();
  const area = input.area.trim();
  const description = input.description.trim();
  if (!name || !category || !area) return { data: null, error: "Business name, category, and local area are required." };
  if (name.length > 140 || description.length > 1500 || area.length > 120) return { data: null, error: "Please shorten the business details and try again." };
  if (input.email.trim() && !/^\S+@\S+\.\S+$/.test(input.email.trim())) return { data: null, error: "Enter a valid business email address or leave it blank." };
  if (input.website.trim() && !/^https?:\/\//i.test(input.website.trim())) return { data: null, error: "Add https:// before the website address." };
  if (input.locationMode === "service" && input.serviceAreas.filter(Boolean).length === 0) return { data: null, error: "Add at least one service area for a service-based business." };
  return { data: { ...input, name, category, area, description, address: input.address.trim(), phone: input.phone.trim(), email: input.email.trim(), website: input.website.trim(), businessType: input.businessType.trim(), serviceAreas: input.serviceAreas.map((areaName) => areaName.trim()).filter(Boolean), openingHours: input.openingHours.trim() }, error: null };
}

export function businessTypeLabel(mode: BusinessLocationMode) {
  if (mode === "physical") return "Customers visit a physical location";
  if (mode === "service") return "You travel to customers";
  return "You have a location and travel to customers";
}
