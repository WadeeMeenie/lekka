import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View, Share } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { deleteOwnPost } from "@/lib/post-actions";
import { useColors } from "@/hooks/use-colors";

type Action = { label: string; icon: keyof typeof MaterialIcons.glyphMap; destructive?: boolean; onPress: () => void };

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
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (!busy) {
      setConfirmDelete(false);
      setVisible(false);
    }
  };

  const deletePost = async () => {
    setBusy(true);
    const result = await deleteOwnPost(postId);
    setBusy(false);
    if (result.error) return;
    setConfirmDelete(false);
    setVisible(false);
    onDeleted?.();
  };

  const actions: Action[] = isOwner
    ? [
        { label: "Edit post", icon: "edit", onPress: () => { setVisible(false); router.push({ pathname: "/edit-post/[id]", params: { id: postId } }); } },
        { label: "Delete post", icon: "delete-outline", destructive: true, onPress: () => setConfirmDelete(true) },
      ]
    : [
        { label: "Not interested", icon: "visibility-off", onPress: () => { setVisible(false); onNotInterested?.(); } },
        { label: "Report post", icon: "flag", destructive: true, onPress: () => setVisible(false) },
        { label: "Share post", icon: "ios-share", onPress: () => { setVisible(false); void Share.share({ message: `Check out this post on Lekka: ${postId}` }); } },
      ];

  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Post options" onPress={() => setVisible(true)} hitSlop={12} style={styles.trigger}>
      <MaterialIcons name="more-horiz" size={22} color={colors.muted} />
    </Pressable>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.scrim} onPress={close}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.foreground }]}>{confirmDelete ? "Delete this post?" : "Post options"}</Text>
          {confirmDelete ? <>
            <Text style={[styles.subtitle, { color: colors.muted }]}>This removes your post permanently.</Text>
            <View style={styles.confirmRow}>
              <Pressable disabled={busy} onPress={() => setConfirmDelete(false)} style={[styles.button, { borderColor: colors.border }]}><Text style={[styles.buttonText, { color: colors.foreground }]}>Cancel</Text></Pressable>
              <Pressable disabled={busy} onPress={() => void deletePost()} style={[styles.button, { backgroundColor: colors.error }]}><Text style={styles.destructiveText}>{busy ? "Deleting…" : "Delete"}</Text></Pressable>
            </View>
          </> : <View style={styles.actionList}>
            {actions.map((action) => <Pressable key={action.label} onPress={action.onPress} accessibilityRole="button" style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
              <View style={[styles.iconCircle, { backgroundColor: action.destructive ? `${colors.error}22` : colors.background }]}><MaterialIcons name={action.icon} size={21} color={action.destructive ? colors.error : colors.foreground} /></View>
              <Text style={[styles.actionText, { color: action.destructive ? colors.error : colors.foreground }]}>{action.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
            </Pressable>)}
          </View>}
          <Pressable disabled={busy} onPress={close} style={styles.cancel}><Text style={[styles.cancelText, { color: colors.muted }]}>Cancel</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.62)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  handle: { width: 32, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "800", marginBottom: 5 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  actionList: { gap: 2, marginTop: 4 },
  action: { minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, paddingHorizontal: 4 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  actionText: { flex: 1, fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.7 },
  confirmRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  button: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "700" },
  destructiveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  cancel: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  cancelText: { fontSize: 13, fontWeight: "700" },
});
