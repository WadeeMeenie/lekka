import * as Location from "expo-location";
import { Platform } from "react-native";

export type LocationResult =
  | { status: "granted"; area: string; latitude: number; longitude: number }
  | { status: "denied" | "unavailable"; area: string };

export async function requestApproximateLocation(fallbackArea = "Bellville"): Promise<LocationResult> {
  if (Platform.OS === "web") return { status: "unavailable", area: fallbackArea };
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) return { status: "unavailable", area: fallbackArea };
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return { status: "denied", area: fallbackArea };
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
  return {
    status: "granted",
    area: fallbackArea,
    latitude: roundCoordinate(position.coords.latitude),
    longitude: roundCoordinate(position.coords.longitude),
  };
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000;
}
