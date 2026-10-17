import type { DiscoveryItem } from "@/lib/discovery";

export type DiscoveryDestination =
  | { pathname: "/local/[id]"; params: { id: string } }
  | { pathname: "/discovery/[type]/[id]"; params: { type: "event" | "deal"; id: string } }
  | { pathname: "/post/[id]"; params: { id: string } };

/** Keep discovery cards and directory cards pointed at the canonical detail screen for each entity. */
export function getDiscoveryDestination(
  item: Pick<DiscoveryItem, "sourceType" | "id" | "businessId">,
): DiscoveryDestination {
  if (item.sourceType === "business") {
    return { pathname: "/local/[id]", params: { id: item.businessId ?? item.id } };
  }

  if (item.sourceType === "event" || item.sourceType === "deal") {
    return { pathname: "/discovery/[type]/[id]", params: { type: item.sourceType, id: item.id } };
  }

  return { pathname: "/post/[id]", params: { id: item.id } };
}
