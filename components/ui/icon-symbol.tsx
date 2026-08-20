import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconName =
  | "house.fill" | "location.fill" | "plus.circle.fill" | "person.2.fill" | "building.2.fill"
  | "bell.fill" | "magnifyingglass" | "chevron.right" | "heart.fill" | "bubble.left.fill"
  | "square.and.arrow.up" | "bookmark.fill" | "checkmark.seal.fill" | "map.fill" | "list.bullet"
  | "slider.horizontal.3" | "arrow.up.right" | "person.crop.circle.fill" | "gearshape.fill"
  | "photo.fill" | "exclamationmark.triangle.fill" | "calendar" | "tag.fill" | "briefcase.fill"
  | "cart.fill" | "wrench.and.screwdriver.fill" | "message.fill" | "person.3.fill" | "clock.fill"
  | "shield.fill" | "location" | "plus" | "close";

type MaterialName = ComponentProps<typeof MaterialIcons>["name"];
const MAPPING: Record<IconName, MaterialName> = {
  "house.fill": "home", "location.fill": "radar", "plus.circle.fill": "add-circle", "person.2.fill": "people", "building.2.fill": "storefront",
  "bell.fill": "notifications-none", magnifyingglass: "search", "chevron.right": "chevron-right", "heart.fill": "favorite-border", "bubble.left.fill": "chat-bubble-outline",
  "square.and.arrow.up": "ios-share", "bookmark.fill": "bookmark-border", "checkmark.seal.fill": "verified", "map.fill": "map", "list.bullet": "view-list",
  "slider.horizontal.3": "tune", "arrow.up.right": "north-east", "person.crop.circle.fill": "account-circle", "gearshape.fill": "settings",
  "photo.fill": "photo-library", "exclamationmark.triangle.fill": "warning-amber", calendar: "event", "tag.fill": "sell", "briefcase.fill": "work-outline",
  "cart.fill": "shopping-bag", "wrench.and.screwdriver.fill": "handyman", "message.fill": "forum", "person.3.fill": "groups", "clock.fill": "schedule",
  "shield.fill": "shield", location: "location-on", plus: "add", close: "close",
};

export function IconSymbol({ name, size = 24, color, style, weight: _weight }: { name: IconName; size?: number; color: string | OpaqueColorValue; style?: StyleProp<TextStyle>; weight?: string }) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
