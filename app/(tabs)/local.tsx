import { Redirect } from "expo-router";

/** Legacy /local entry point; all local discovery now lives in Explore. */
export default function LegacyLocalRoute() {
  return <Redirect href="/(tabs)/nearby" />;
}
