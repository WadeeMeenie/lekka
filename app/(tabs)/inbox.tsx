import MessagesScreen from "../messages";

/** The tab and legacy /messages entry share the same inbox implementation. */
export default function InboxTabScreen() {
  return <MessagesScreen />;
}
