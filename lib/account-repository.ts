import { type BusinessProfileInput, type PersonalIdentityInput, validateBusinessProfile, validatePersonalIdentity } from "@/lib/account";
import { supabase } from "@/lib/supabase";
import { uploadMedia } from "@/lib/supabase-repository";

export async function loadPersonalIdentity() {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase.from("personal_identities").select("first_name, surname, date_of_birth, gender").eq("user_id", user.id).maybeSingle();
}

export async function savePersonalIdentity(input: PersonalIdentityInput) {
  const validated = validatePersonalIdentity(input);
  if (!validated.data) return { error: new Error(validated.error) };
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };

  const displayName = `${validated.data.firstName} ${validated.data.surname}`;
  const profile = await supabase.from("profiles").upsert({ id: user.id, display_name: displayName, account_intent: "personal", updated_at: new Date().toISOString() });
  if (profile.error) return { error: profile.error };
  const identity = await supabase.from("personal_identities").upsert({ user_id: user.id, first_name: validated.data.firstName, surname: validated.data.surname, date_of_birth: validated.data.dateOfBirth, gender: validated.data.gender, updated_at: new Date().toISOString() });
  return { error: identity.error };
}

export async function createBusinessProfile(input: BusinessProfileInput) {
  const validated = validateBusinessProfile(input);
  if (!validated.data) return { data: null, error: new Error(validated.error) };
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const business = validated.data;
  const { data, error } = await supabase.rpc("create_business_profile", {
    p_name: business.name, p_category: business.category, p_description: business.description, p_area: business.area,
    p_address: business.address, p_phone: business.phone, p_email: business.email, p_website: business.website,
    p_business_type: business.businessType, p_location_mode: business.locationMode, p_service_areas: business.serviceAreas,
    p_opening_hours: business.openingHours ? { summary: business.openingHours } : {}, p_latitude: business.latitude ?? null, p_longitude: business.longitude ?? null,
  });
  return { data, error };
}

export async function updateBusinessProfile(businessId: string, input: BusinessProfileInput) {
  const validated = validateBusinessProfile(input);
  if (!validated.data) return { data: null, error: new Error(validated.error) };
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const business = validated.data;
  const { data, error } = await supabase.rpc("update_business_profile", {
    p_business_id: businessId, p_name: business.name, p_category: business.category, p_description: business.description,
    p_area: business.area, p_address: business.address, p_phone: business.phone, p_email: business.email,
    p_website: business.website, p_business_type: business.businessType, p_location_mode: business.locationMode,
    p_service_areas: business.serviceAreas, p_opening_hours: business.openingHours ? { summary: business.openingHours } : {},
  });
  return { data, error };
}

export async function listMyBusinessProfiles() {
  if (!supabase) return { data: [], error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [], error: new Error("Please sign in") };
  return supabase.from("business_members").select("role, businesses(id, name, category, area, verification_state, logo_path)").eq("user_id", user.id).order("created_at", { ascending: false });
}

export async function loadMyBusinessProfile(businessId: string) {
  if (!supabase) return { data: null, error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: new Error("Please sign in") };
  return supabase.from("business_members").select("role, businesses(id, name, category, description, area, address, phone, business_email, website, business_type, location_mode, service_areas, opening_hours)").eq("business_id", businessId).eq("user_id", user.id).maybeSingle();
}

export async function saveBusinessLogo(businessId: string, uri: string, contentType = "image/jpeg") {
  if (!supabase) return { error: new Error("Backend is not configured") };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: new Error("Please sign in") };
  const path = `${user.id}/businesses/${businessId}/logo`;
  const upload = await uploadMedia(uri, path, contentType);
  if (upload.error) return { error: upload.error };
  const update = await supabase.from("businesses").update({ logo_path: path, updated_at: new Date().toISOString() }).eq("id", businessId);
  return { error: update.error };
}
