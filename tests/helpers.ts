import { BotsHost } from "../server/host";
import { EMPTY_LIBRARY, type Bot, type BotSettingsValues, type Library } from "../shared/bot";

export const NOW = "2026-09-27T00:00:00.000Z";

export function makeBot(patch: Partial<Bot> = {}): Bot {
  return {
    id: "bot-1",
    name: "Inbox",
    title: "",
    description: "",
    avatar: { seed: "s", palette: null, shape: "circle", imageUrl: null },
    hostId: null,
    provider: "claude",
    model: null,
    modeId: null,
    thinkingOptionId: null,
    soul: "",
    mcpServerIds: [],
    alwaysAllow: [],
    skillIds: [],
    apps: [],
    appRules: {},
    voice: { name: null, readReplies: false },
    contactBots: "ask",
    routines: [],
    playbooks: [],
    cwd: null,
    pinned: false,
    archived: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...patch,
  };
}

export interface FakeChat {
  status: string;
  labels: Record<string, string>;
  title?: string;
  reply?: string;
  pendingPermissions?: unknown[];
  updatedAt?: string;
  down?: "refresh" | "send";
}

interface FakeListOptions {
  filter?: { labels?: Record<string, string>; statuses?: string[] };
  sort?: { key: string; direction: "asc" | "desc" }[];
  page?: { limit: number };
}

/** A send into a running chat fails, as the real daemon would interrupt it. */
export function fakePaseo(chats: Record<string, FakeChat>, sent: Record<string, string[]> = {}) {
  const snapshot = (id: string, chat: FakeChat) => ({ id, status: chat.status, labels: chat.labels, title: chat.title ?? null, pendingPermissions: chat.pendingPermissions ?? [], lastError: null, updatedAt: chat.updatedAt ?? NOW });
  return {
    agents: {
      list: async ({ filter, sort, page }: FakeListOptions = {}) => {
        const entries = Object.entries(chats)
          .filter(([, chat]) => Object.entries(filter?.labels ?? {}).every(([key, value]) => chat.labels[key] === value) && (!filter?.statuses || filter.statuses.includes(chat.status)))
          .map(([id, chat]) => ({ agent: snapshot(id, chat) }));
        if (sort?.[0]?.key === "updated_at") entries.sort((a, b) => (sort[0]!.direction === "desc" ? -1 : 1) * a.agent.updatedAt.localeCompare(b.agent.updatedAt));
        return { entries: page ? entries.slice(0, page.limit) : entries };
      },
      ref: (id: string) => ({
        refresh: async () => {
          const chat = chats[id];
          if (chat?.down === "refresh") throw new Error("daemon away");
          return chat ? { agent: snapshot(id, chat) } : null;
        },
        respondToPermission: async () => undefined,
        send: async (text: string) => {
          const chat = chats[id];
          if (!chat) throw new Error(`There's no chat ${id}.`);
          if (chat.down === "send") throw new Error("daemon away");
          if (chat.status === "running") throw new Error(`Sent into chat ${id} while it was running.`);
          (sent[id] ??= []).push(text);
          chat.status = "running";
        },
        timeline: {
          refetch: async () => ({
            entries: [
              { item: { type: "user_message", text: "question" } },
              ...(chats[id]?.reply ? [{ item: { type: "assistant_message", text: chats[id]!.reply } }] : []),
            ],
          }),
        },
      }),
    },
  } as never;
}

/** A host over in-memory settings; `values` can be mutated between calls. */
export function fakeHost(bots: Bot[], library: Library = EMPTY_LIBRARY): BotsHost & { values(): Promise<BotSettingsValues> } {
  const values: BotSettingsValues = { bots, history: [], library };
  const settings = { read: async () => ({ status: "ready" as const, values, revision: "1" }) };
  return new BotsHost(settings as never) as BotsHost & { values(): Promise<BotSettingsValues> };
}
