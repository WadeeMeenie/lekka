import { supabase } from "@/lib/supabase";
import type { DeviceLocation } from "@/lib/location";
import { discoveryRadiusToMeters, loadSettings, type DiscoveryContentType, type RadarCategory } from "@/lib/local-radar";

export type DiscoveryItem = {
  sourceType: "post" | "alert" | "business" | "event" | "deal";
  id: string;
  businessId: string | null;
  category: string;
  title: string;
  description: string;
  area: string;
  distanceMeters: number;
  createdAt: string;
  startsAt: string | null;
  endsAt: string | null;
  verified: boolean;
};

export type DiscoveryFilters = {
  location: DeviceLocation;
  radiusMeters?: number;
  contentType?: DiscoveryContentType;
  category?: RadarCategory | "All";
  search?: string;
  limit?: number;
};

export async function discoverNearby(filters: DiscoveryFilters): Promise<{ data: DiscoveryItem[]; error: Error | null }> {
  if (!supabase) return { data: [], error: new Error("Backend is not configured") };
  const settings = await loadSettings();
  const radiusMeters = filters.radiusMeters ?? discoveryRadiusToMeters(settings.radius);
  const { data, error } = await supabase.rpc("discover_nearby", {
    latitude: filters.location.latitude,
    longitude: filters.location.longitude,
    radius_meters: radiusMeters,
    content_type_filter: filters.contentType ?? "all",
    category_filter: filters.category && filters.category !== "All" ? filters.category : "all",
    search_query: filters.search?.trim() || null,
    result_limit: filters.limit ?? 100,
  });
  if (error) return { data: [], error };
  return {
    data: (data ?? []).map((row: any) => ({
      sourceType: row.source_type,
      id: row.id,
      businessId: row.business_id ?? null,
      category: row.category,
      title: row.title,
      description: row.description ?? "",
      area: row.area,
      distanceMeters: Number(row.distance_meters ?? 0),
      createdAt: row.created_at,
      startsAt: row.starts_at ?? null,
      endsAt: row.ends_at ?? null,
      verified: Boolean(row.verified),
    })) as DiscoveryItem[],
    error: null,
  };
}

export function discoveryDistanceLabel(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters)) return "Nearby";
  if (distanceMeters < 100) return "<100 m";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters / 10) * 10} m`;
  const km = distanceMeters / 1000;
  return `${km >= 10 ? Math.round(km) : Number(km.toFixed(1))} km`;
}
