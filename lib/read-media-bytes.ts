import { File } from "expo-file-system";
import { Platform } from "react-native";

export async function readMediaBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS !== "web") return new File(uri).bytes();
  // The web picker returns a blob/data URL. Expo's native File.bytes API is
  // unavailable on web, so read the selected browser resource directly.
  const response = await fetch(uri);
  if (!response.ok) throw new Error("Could not read the selected photo. Please choose it again.");
  return new Uint8Array(await response.arrayBuffer());
}
