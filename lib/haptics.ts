import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export const haptic = {
  toggle: () => {
    if (Platform.OS !== "web") void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  selection: () => {
    if (Platform.OS !== "web") void Haptics.selectionAsync();
  },
};
