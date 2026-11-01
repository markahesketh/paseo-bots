import type { Bot } from "./bot";

export const ASK_PATH_LABEL = "paseo-bots.ask-path";
export const ASK_DEPTH_MAX = 4;
export const WAKE_CAP = 10;

export interface AskHop {
  botId: string;
  chatId: string;
}
export type AskPath = readonly AskHop[];

/** Bot ids and Paseo's agent ids (uuids, as the relay's tool URLs already require), so neither holds `@` or `,`. */
const HOP_ID = /^[a-z0-9-]+$/;

export function parseAskPath(label: string | undefined): AskPath {
  if (!label) return [];
  return label.split(",").map((pair) => {
    const [botId, chatId, ...rest] = pair.split("@");
    if (!botId || !chatId || rest.length || !HOP_ID.test(botId) || !HOP_ID.test(chatId)) throw new Error(`Unreadable ask path "${label}".`);
    return { botId, chatId };
  });
}

export function formatAskPath(path: AskPath): string {
  for (const hop of path) if (!HOP_ID.test(hop.botId) || !HOP_ID.test(hop.chatId)) throw new Error(`"${hop.botId}@${hop.chatId}" can't go in an ask path.`);
  return path.map((hop) => `${hop.botId}@${hop.chatId}`).join(",");
}

export function canAsk(bot: Pick<Bot, "contactBots">, path: AskPath): boolean {
  return bot.contactBots !== "off" && path.length < ASK_DEPTH_MAX;
}

export function mayTarget(caller: { botId: string; path: AskPath }, targetBotId: string): boolean {
  return targetBotId !== caller.botId && !caller.path.some((hop) => hop.botId === targetBotId);
}

export function mayRead(callerBotId: string, target: { botId: string; path: AskPath }): boolean {
  return target.botId === callerBotId || target.path.some((hop) => hop.botId === callerBotId);
}

export function mayFollowUp(callerChatId: string, targetPath: AskPath): boolean {
  return targetPath.some((hop) => hop.chatId === callerChatId);
}

export interface NamedHop extends AskHop {
  name: string;
}

function listNames(names: readonly string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

export function chainPrompt(path: readonly NamedHop[]): string {
  const names = path.map((hop) => hop.name);
  const position = ["1st", "2nd", "3rd"][path.length] ?? `${path.length + 1}th`;
  return `You're ${position} in ${names.join(" → ")} → you. You can't ask ${listNames(names)}. Your reply here goes back to ${names.at(-1)} automatically; make it the answer to its question. If you ask other bots or start Paseo agents, nothing goes back until they've all finished. You're woken with their results, so end that turn with the real answer. Leave notifyOnFinish on when you use create_agent, or nothing wakes you when its agent finishes.`;
}

export interface ChatRef {
  id: string;
  title: string;
}

export function otherChatsPrompt(chats: readonly ChatRef[]): string {
  return `You're also at work in these chats right now, newest first:\n${chats.map((chat) => `- "${chat.title}" (chat ${chat.id})`).join("\n")}\nThey may touch the same files or worktree as this one, so coordinate with them or work in a separate worktree.`;
}
