import type { Bot } from "./bot";

// Asks between bots form chains: A asks B in a new chat of B's, B may ask C
// from there, and so on. An asked chat carries its ancestry in one label, so
// the tools and the prompt can tell who may ask, read and follow up, and how
// deep the chain already is.

/** Label on a chat started by ask_bot: the asking chats, root first, as `botId@chatId` pairs joined by `,`. */
export const ASK_PATH_LABEL = "paseo-bots.ask-path";
/** A chat with this many ancestors can't ask further. */
export const ASK_DEPTH_MAX = 4;

export interface AskHop {
  botId: string;
  chatId: string;
}
/** The chats that led to a chat, root first; its parent is the last hop. */
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

/** Whether a chat may ask other bots: its bot allows it and the chain isn't at its depth limit. */
export function canAsk(bot: Pick<Bot, "contactBots">, path: AskPath): boolean {
  return bot.contactBots !== "off" && path.length < ASK_DEPTH_MAX;
}

/** A chat may ask any bot but its own and the ones already in its chain, so asks can't loop. */
export function mayTarget(caller: { botId: string; path: AskPath }, targetBotId: string): boolean {
  return targetBotId !== caller.botId && !caller.path.some((hop) => hop.botId === targetBotId);
}

/** A bot may read its own chats and the chats of chains any of its chats is in. */
export function mayRead(callerBotId: string, target: { botId: string; path: AskPath }): boolean {
  return target.botId === callerBotId || target.path.some((hop) => hop.botId === callerBotId);
}

/** Only a chat in the target's chain may send it a follow-up. */
export function mayFollowUp(callerChatId: string, targetPath: AskPath): boolean {
  return targetPath.some((hop) => hop.chatId === callerChatId);
}

/** A hop with its bot's name, for the prompt. */
export interface NamedHop extends AskHop {
  name: string;
}

function listNames(names: readonly string[]): string {
  return names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
}

/** The prompt section of an asked chat: its place in the chain, whom it can't ask, and where its reply goes. */
export function chainPrompt(path: readonly NamedHop[]): string {
  const names = path.map((hop) => hop.name);
  const position = ["1st", "2nd", "3rd"][path.length] ?? `${path.length + 1}th`;
  return `You're ${position} in ${names.join(" → ")} → you. You can't ask ${listNames(names)}. Your reply here goes back to ${names.at(-1)} automatically; make it the answer to its question.`;
}
