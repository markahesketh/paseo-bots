import type { PluginLifecycleEvents } from "@getpaseo/plugin/server";
import { lastTurn, logLine } from "../shared/activity";
import type { Asks } from "./asks";
import { readLastTurn } from "./chats";
import type { BotsHost } from "./host";
import type { MemoryJournal } from "./journal";
import { appendDailyLog } from "./memory";
import type { RoutineScheduler } from "./scheduler";

// What happens around each turn of a bot's chat: the journal notes memory
// changes, replies to other bots go out, and the daily log gets a line saying
// what the bot did.

export async function turnStarted(host: BotsHost, journal: MemoryJournal, asks: Pick<Asks, "turnStarted">, { agent }: PluginLifecycleEvents["agent.turn_started"]): Promise<void> {
  await asks.turnStarted(agent.id).catch((error: unknown) => console.error("paseo-bots: couldn't send mail a pause held", error));
  const botId = await host.botIdOf(agent.id);
  if (botId) await journal.begin(botId);
}

export async function turnEnded(host: BotsHost, journal: MemoryJournal, scheduler: Pick<RoutineScheduler, "finished">, asks: Pick<Asks, "turnEnded" | "hasOpenAsks">, { agent, outcome, timeline }: PluginLifecycleEvents["agent.turn_ended"]): Promise<void> {
  const chat = await host.chatOf(agent.id);
  if (!chat) return;
  const { botId } = chat;
  const title = chat.title?.trim() || agent.title?.trim() || "Untitled chat";
  // Paseo sends turn_ended with an empty timeline, so the turn is read from the chat. Without it no
  // reply is pushed: the chat keeps owing one, so check_chat or its next turn end can still deliver it.
  const turn = await readLastTurn(host.requirePaseo(), agent.id).catch((error: unknown) => {
    console.error("paseo-bots: couldn't read a finished turn", error);
    return null;
  });
  const { reply, tools } = turn ?? lastTurn(timeline);
  const line = outcome.kind === "canceled" ? null : logLine({ at: new Date(), chat: title, reply, tools, failure: outcome.kind === "failed" ? outcome.error.message : null });
  const steps: [string, Promise<unknown> | null][] = [
    ["note memory changes", journal.end(botId, { id: agent.id, title })],
    // A run that asked a bot finishes with the turn that answers, not with "Asked B...".
    ["record a routine run", chat.routineId && !asks.hasOpenAsks(agent.id) ? scheduler.finished(chat.routineId, agent.id, outcome, reply) : null],
    ["deliver a bot's reply", turn && asks.turnEnded(agent.id, outcome, turn.reply)],
    ["write the daily log", line ? appendDailyLog(botId, line) : null],
  ];
  await Promise.all(steps.map(([what, step]) => step?.catch((error: unknown) => console.error(`paseo-bots: couldn't ${what}`, error))));
}
