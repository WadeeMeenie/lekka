import * as Location from "expo-location";
import { Platform } from "react-native";

export type DeviceLocation = {
  latitude: number;
  longitude: number;
  area: string;
  capturedAt: number;
};

export type LocationResult =
  | { status: "granted"; location: DeviceLocation }
  | { status: "denied" | "unavailable"; area: string };

const MOVEMENT_REFRESH_METERS = 500;
const LOCATION_REFRESH_INTERVAL_MS = 120_000;

export async function requestApproximateLocation(fallbackArea = "your area"): Promise<LocationResult> {
  if (Platform.OS === "web") return { status: "unavailable", area: fallbackArea };
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) return { status: "unavailable", area: fallbackArea };
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return { status: "denied", area: fallbackArea };
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true });
  return { status: "granted", location: await toDeviceLocation(position, fallbackArea) };
}

export async function getGrantedLocationOrFallback(fallbackArea = "your area"): Promise<LocationResult> {
  if (Platform.OS === "web") return { status: "unavailable", area: fallbackArea };
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return { status: "denied", area: fallbackArea };
  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LOCATION_REFRESH_INTERVAL_MS, requiredAccuracy: 1000 });
  if (lastKnown) return { status: "granted", location: await toDeviceLocation(lastKnown, fallbackArea) };
  try {
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { status: "granted", location: await toDeviceLocation(position, fallbackArea) };
  } catch {
    return { status: "unavailable", area: fallbackArea };
  }
}

/** Passive location read. It never asks the user for permission. */
export async function getLastKnownOrCurrentLocation(fallbackArea = "your area"): Promise<LocationResult> {
  return getGrantedLocationOrFallback(fallbackArea);
}

export async function watchMeaningfulForegroundLocation(
  onLocation: (location: DeviceLocation) => void,
  fallbackArea = "your area",
): Promise<() => void> {
  if (Platform.OS === "web") return () => undefined;
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== Location.PermissionStatus.GRANTED) return () => undefined;
  const subscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: MOVEMENT_REFRESH_METERS, timeInterval: LOCATION_REFRESH_INTERVAL_MS, mayShowUserSettingsDialog: false },
    (position) => { void toDeviceLocation(position, fallbackArea).then(onLocation); },
  );
  return () => subscription.remove();
}

async function toDeviceLocation(position: Location.LocationObject, fallbackArea: string): Promise<DeviceLocation> {
  let area = fallbackArea;
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    area = place?.district || place?.city || place?.subregion || place?.region || fallbackArea;
  } catch {
    // Reverse geocoding is best-effort; the backend still receives coordinates.
  }
  return { latitude: position.coords.latitude, longitude: position.coords.longitude, area, capturedAt: Date.now() };
}
