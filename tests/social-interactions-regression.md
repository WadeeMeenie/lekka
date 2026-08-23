# Lekka social interaction regression checklist

Manual/E2E checks for the social interaction fixes on `fix/social-interactions`.

1. Tap React once: reaction count increases by one.
2. Tap React again: reaction is removed and count decreases by one.
3. Tap React repeatedly: count never accumulates duplicate reactions.
4. Long-press React: reaction picker shows 👍 ❤️ 😂 😮 😢 😡.
5. Select another emoji: existing reaction changes rather than creating another row.
6. Comment opens the post detail/comment screen.
7. Save invokes the atomic save/unsave operation.
8. Share invokes the native share sheet.
9. Not interested persists and shows: "You won't see posts like this in future."
10. Test the same post from a second device/account session to verify state comes from Supabase rather than local counters.
