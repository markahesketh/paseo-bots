import type { PluginTheme } from "@getpaseo/plugin";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { Pressable, Text, View } from "react-native";
import type { BotMessage } from "../../../shared/bot-messages";
import { Markdown } from "../../Markdown";
import { ui } from "../../typography";

type Colors = PluginTheme["colors"];

const ICONS: Record<BotMessage["kind"], string> = { reply: "Bot", ask: "MessageSquare", stopped: "TriangleAlert", paused: "TriangleAlert", closed: "X" };

function title(message: BotMessage): string {
  switch (message.kind) {
    case "reply":
      return `Reply from ${message.bot}`;
    case "ask":
      return `Asked by ${message.bot}`;
    case "stopped":
      return `${message.bot} stopped`;
    case "paused":
      return "Replies paused";
    case "closed":
      return "Chat closed before it answered";
  }
}

export function BotMessageCard({ colors, message, onOpenChat }: { colors: Colors; message: BotMessage; onOpenChat?: (chatId: string) => void }) {
  const chatId = "chatId" in message ? message.chatId : null;
  const body = "body" in message ? message.body : "";
  const chatStyle = { color: colors.foregroundMuted, fontSize: ui(12), lineHeight: 16 };
  return (
    <View style={{ padding: 12, borderRadius: 8, borderWidth: 1, backgroundColor: colors.surface1, borderColor: colors.border, gap: 8 }}>
      <View style={{ gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 24 }}>
          <Icon name={ICONS[message.kind]} size={16} color={colors.foregroundMuted} />
          <Text style={{ flex: 1, color: colors.foreground, fontSize: ui(14), lineHeight: 22 }}>{title(message)}</Text>
        </View>
        {chatId && onOpenChat ? (
          <Pressable accessibilityRole="link" accessibilityLabel={`Open chat ${chatId}`} onPress={() => onOpenChat(chatId)} style={{ alignSelf: "flex-start" }}>
            <Text style={{ ...chatStyle, textDecorationLine: "underline" }}>{`chat ${chatId}`}</Text>
          </Pressable>
        ) : chatId ? (
          <Text selectable style={chatStyle}>{`chat ${chatId}`}</Text>
        ) : null}
      </View>
      {body ? <Markdown colors={colors} text={body} /> : null}
    </View>
  );
}
