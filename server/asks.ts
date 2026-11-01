import type { PluginLifecycleEvents, PluginTurnOutcome } from "@getpaseo/plugin/server";
import { ASK_PATH_LABEL, parseAskPath, WAKE_CAP, type AskHop } from "../shared/asks";
import { BOT_LABEL } from "../shared/bot";
import { closedMessage, joinBotMessages, pausedMessage, replyMessage, stoppedMessage } from "../shared/bot-messages";
import { teamOf } from "../shared/groups";
import type { BotsHost } from "./host";

export const REPLY_MAX = 8_000;

export interface Mail {
  from: string;
  text: string;
  notice?: true;
}

/** Paseo's label on an agent a chat started with its create_agent tool; a detached one carries none. */
const PARENT_AGENT_LABEL = "paseo.parent-agent-id";

export interface RunningAgent {
  id: string;
  title: string;
  state: "running" | "permission";
}

export function capReply(reply: string, chatId: string, from = 0): string {
  const end = from + REPLY_MAX;
  const part = reply.slice(from, end);
  return end < reply.length ? `${part}\n[cut at ${end} of ${reply.length} characters; read the rest with check_chat chat ${chatId} from ${end}]` : part;
}

function rootIn(labels: Record<string, string>, chatId: string): string {
  return parseAskPath(labels[ASK_PATH_LABEL])[0]?.chatId ?? chatId;
}

function replyText(who: string, chatId: string, outcome: PluginTurnOutcome, reply: string): string {
  if (outcome.kind !== "completed") return stoppedMessage(who, chatId, outcome.kind === "failed" ? outcome.error.message : outcome.reason);
  return replyMessage(who, chatId, capReply(reply.trim(), chatId) || "(no reply)");
}

export class Asks {
  private readonly awaiting = new Map<string, string>();
  private readonly asked = new Map<string, string[]>();
  private readonly mail = new Map<string, Mail[]>();
  private readonly mailbox = new Map<string, Promise<void>>();
  private readonly wakes = new Map<string, number>();
  private readonly noticed = new Set<string>();
  private readonly expected = new Set<string>();
  private readonly approved = new Set<string>();

  constructor(private readonly host: BotsHost) {}

  expect(chatId: string, replyTo: string): void {
    this.awaiting.set(chatId, replyTo);
    const children = this.asked.get(replyTo) ?? [];
    if (!children.includes(chatId)) this.asked.set(replyTo, [...children, chatId]);
  }

  forget(chatId: string): void {
    const replyTo = this.awaiting.get(chatId);
    this.awaiting.delete(chatId);
    if (replyTo) this.asked.set(replyTo, (this.asked.get(replyTo) ?? []).filter((child) => child !== chatId));
  }

  askedBy(chatId: string): readonly string[] {
    return this.asked.get(chatId) ?? [];
  }

  async consume(chatId: string, replyTo: string): Promise<void> {
    if (await this.waiting(chatId)) return;
    if (this.awaiting.get(chatId) === replyTo) this.forget(chatId);
    const queued = this.mail.get(replyTo);
    if (queued) this.mail.set(replyTo, queued.filter((item) => item.from !== chatId));
  }

  hasOpenAsks(chatId: string): boolean {
    for (const replyTo of this.awaiting.values()) if (replyTo === chatId) return true;
    return (this.mail.get(chatId) ?? []).some((item) => !item.notice);
  }

  /** Paseo wakes the chat when one of these finishes, so that turn carries the answer. */
  async agentsOf(chatId: string): Promise<RunningAgent[]> {
    const { entries } = await this.host.requirePaseo().agents.list({ filter: { labels: { [PARENT_AGENT_LABEL]: chatId } } });
    return entries.flatMap(({ agent }) => {
      const state = agent.pendingPermissions?.length ? "permission" : agent.status === "running" || agent.status === "initializing" ? "running" : null;
      return state ? [{ id: agent.id, title: agent.title ?? "Untitled", state }] : [];
    });
  }

  async waiting(chatId: string): Promise<boolean> {
    return this.hasOpenAsks(chatId) || (await this.agentsOf(chatId)).length > 0;
  }

  private async cap(root: AskHop): Promise<number> {
    return teamOf(root.botId, (await this.host.values())?.groups ?? [])?.wakeCap ?? WAKE_CAP;
  }

  async paused(root: AskHop): Promise<boolean> {
    return (this.wakes.get(root.chatId) ?? 0) >= (await this.cap(root));
  }

  async turnStarted(chatId: string): Promise<void> {
    if (this.expected.delete(chatId)) return;
    await this.reset(chatId);
  }

  async approve(chatId: string, requestId: string): Promise<void> {
    this.approved.add(requestId);
    try {
      await this.host.requirePaseo().agents.ref(chatId).respondToPermission({ requestId, response: { behavior: "allow" } });
    } catch (error) {
      this.approved.delete(requestId);
      throw error;
    }
  }

  /** Paseo denies on its own when it interrupts or fails a turn, so a denial never counts. */
  async permissionResolved(chatId: string, requestId: string, resolution: PluginLifecycleEvents["agent.permission_resolved"]["resolution"]): Promise<void> {
    if (this.approved.delete(requestId) || resolution.behavior !== "allow") return;
    await this.reset(await this.rootOf(chatId));
  }

  private async rootOf(chatId: string): Promise<string> {
    const chat = await this.host.chatOf(chatId);
    if (chat) return rootIn(chat.labels, chatId);
    const parent = (await this.host.requirePaseo().agents.ref(chatId).refresh())?.agent.labels?.[PARENT_AGENT_LABEL];
    if (!parent) return chatId;
    const parentChat = await this.host.chatOf(parent);
    return parentChat ? rootIn(parentChat.labels, parent) : chatId;
  }

  private async reset(rootChatId: string): Promise<void> {
    if (!this.wakes.has(rootChatId)) return;
    this.wakes.delete(rootChatId);
    this.unpause(rootChatId);
    await Promise.all([...this.mail.keys()].map((queued) => this.flush(queued)));
  }

  private unpause(rootChatId: string): void {
    this.noticed.delete(rootChatId);
    const queued = this.mail.get(rootChatId);
    if (queued?.some((item) => item.notice)) this.mail.set(rootChatId, queued.filter((item) => !item.notice));
  }

  async turnEnded(chatId: string, outcome: PluginTurnOutcome, reply: string): Promise<void> {
    try {
      await this.push(chatId, outcome, reply);
    } finally {
      await this.flush(chatId);
    }
  }

  private async push(chatId: string, outcome: PluginTurnOutcome, reply: string): Promise<void> {
    if (!this.awaiting.has(chatId) || this.hasOpenAsks(chatId)) return;
    const [agent, waiting] = await Promise.all([this.host.requirePaseo().agents.ref(chatId).refresh().then((snapshot) => snapshot?.agent), this.waiting(chatId)]);
    const who = (await this.host.bot(agent?.labels?.[BOT_LABEL] ?? ""))?.name ?? "The other bot";
    // Other chats' turn ends run at the same time, and Paseo marks a chat idle before its turn_ended
    // arrives, so a child's reply may have woken this chat meanwhile; that turn's end carries the answer.
    const replyTo = this.awaiting.get(chatId);
    if (replyTo === undefined || waiting || this.hasOpenAsks(chatId) || agent?.status === "running") return;
    this.awaiting.delete(chatId);
    await this.deliver(replyTo, { from: chatId, text: replyText(who, chatId, outcome, reply) });
  }

  deliver(to: string, item: Mail): Promise<void> {
    this.mail.set(to, [...(this.mail.get(to) ?? []), item]);
    return this.flush(to);
  }

  private flush(chatId: string): Promise<void> {
    const run = (this.mailbox.get(chatId) ?? Promise.resolve()).then(() => this.send(chatId));
    this.mailbox.set(chatId, run.catch(() => undefined));
    return run;
  }

  private async send(chatId: string): Promise<void> {
    if (!this.mail.get(chatId)?.length) return;
    const agent = (await this.host.requirePaseo().agents.ref(chatId).refresh())?.agent;
    if (!agent || agent.status === "closed") return this.closed(chatId);
    if ((agent.status !== "idle" && agent.status !== "error") || agent.pendingPermissions?.length) return;
    const path = parseAskPath(agent.labels?.[ASK_PATH_LABEL]);
    const root = path[0] ?? { botId: agent.labels?.[BOT_LABEL] ?? "", chatId };
    // The cap is read before the count, so a reset while the settings load isn't counted over.
    const cap = await this.cap(root);
    const count = this.wakes.get(root.chatId) ?? 0;
    const paused = count >= cap;
    if (!paused) this.unpause(root.chatId);
    if (paused && !this.noticed.has(root.chatId)) {
      this.noticed.add(root.chatId);
      this.mail.set(root.chatId, [...(this.mail.get(root.chatId) ?? []), { from: root.chatId, text: pausedMessage(count), notice: true }]);
      if (root.chatId !== chatId) await this.flush(root.chatId);
    }
    const queued = this.mail.get(chatId) ?? [];
    const items = paused ? queued.filter((item) => item.notice) : queued;
    if (!items.length) return;
    if (!paused) this.wakes.set(root.chatId, count + 1);
    const parent = path.at(-1);
    if (parent && !this.awaiting.has(chatId)) this.awaiting.set(chatId, parent.chatId);
    this.expected.add(chatId);
    try {
      await this.host.requirePaseo().agents.ref(chatId).send(joinBotMessages(items.map((item) => item.text)));
    } catch (error) {
      this.expected.delete(chatId);
      throw error;
    }
    this.mail.set(chatId, (this.mail.get(chatId) ?? []).filter((item) => !items.includes(item)));
    const open = this.asked.get(chatId)?.filter((child) => !items.some((item) => item.from === child));
    if (open) this.asked.set(chatId, open);
  }

  private async closed(chatId: string): Promise<void> {
    this.mail.delete(chatId);
    const replyTo = this.awaiting.get(chatId);
    this.forget(chatId);
    if (replyTo !== undefined) await this.deliver(replyTo, { from: chatId, text: closedMessage(chatId) });
  }
}
