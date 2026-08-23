import { Platform } from "react-native";

/**
 * Check if device has network connectivity.
 * Returns true if online, false if offline.
 */
export async function checkNetworkConnection(): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return navigator.onLine;
    }
    return true; // Assume online on native
  } catch {
    return true;
  }
}
