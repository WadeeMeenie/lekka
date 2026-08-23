import { Alert, Pressable, Text, View } from "react-native";
import { deleteOwnPost } from "@/lib/post-actions";

export function PostActionsMenu({
  postId,
  isOwner,
  onDeleted,
  onNotInterested,
}: {
  postId: string;
  isOwner: boolean;
  onDeleted?: () => void;
  onNotInterested?: () => void;
}) {
  const open = () => {
    const options: Array<{ text: string; style?: "cancel" | "destructive"; onPress?: () => void }> = [];
    if (isOwner) {
      options.push({
        text: "Delete post",
        style: "destructive",
        onPress: () => {
          Alert.alert("Delete post?", "This can't be undone.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                const result = await deleteOwnPost(postId);
                if (result.error) {
                  Alert.alert("Couldn't delete post", result.error.message || "Please try again.");
                  return;
                }
                onDeleted?.();
              },
            },
          ]);
        },
      });
    }
    options.push({ text: "Not interested", onPress: onNotInterested });
    options.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Post options", "", options);
  };

  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={open} hitSlop={12}>
      <Text style={{ fontSize: 22, lineHeight: 24 }}>⋯</Text>
    </Pressable>
  );
}
