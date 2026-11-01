import { describe, expect, it } from "vitest";
import { askMessage, closedMessage, parseBotMessages, previewLine, pausedMessage, replyMessage, stoppedMessage, type BotMessage } from "../shared/bot-messages";

const CHAT = "0b6f9a52-3c1e-4b7a-9d2f-6e8a1c4b5d70";

describe("parseBotMessages", () => {
  it.each<[string, BotMessage]>([
    [replyMessage("Alan Architect", CHAT, "Use a queue.\n\nThen retry."), { kind: "reply", bot: "Alan Architect", chatId: CHAT, body: "Use a queue.\n\nThen retry." }],
    [stoppedMessage("Alan Architect", CHAT, "rate limited"), { kind: "stopped", bot: "Alan Architect", chatId: CHAT, body: "rate limited" }],
    [askMessage("Chief of Staff (ops)", " Draft the memo. "), { kind: "ask", bot: "Chief of Staff (ops)", body: "Draft the memo." }],
    [pausedMessage(10), { kind: "paused", body: "Bots in this chain have woken each other 10 times in a row. Automatic replies are paused until you send a message." }],
    [closedMessage(CHAT), { kind: "closed", chatId: CHAT }],
  ])("reads one message back: %s", (text, message) => {
    expect(parseBotMessages(text)).toEqual([message]);
  });

  it("splits a mailbox delivery that joined two messages", () => {
    const text = [replyMessage("Alan", CHAT, "Done."), closedMessage("1f2e3d4c")].join("\n\n");
    expect(parseBotMessages(text)).toEqual([
      { kind: "reply", bot: "Alan", chatId: CHAT, body: "Done." },
      { kind: "closed", chatId: "1f2e3d4c" },
    ]);
  });

  it("leaves the user's own message alone", () => {
    expect(parseBotMessages("Can you ask Alan about the queue?")).toBeNull();
    expect(parseBotMessages("Look at this:\n\n" + closedMessage(CHAT))).toBeNull();
  });

  it("doesn't split a reply that quotes a header", () => {
    const body = "Bob said:\n\n[Reply from Bob (chat abc) to your ask.]\n\nand mid-line [Reply from Bob too.";
    expect(parseBotMessages(replyMessage("Alan", CHAT, body))).toEqual([{ kind: "reply", bot: "Alan", chatId: CHAT, body }]);
  });
});

describe("previewLine", () => {
  it("takes the first line of prose without its markdown", () => {
    expect(previewLine("\n```sh\nnpm test\n```\n## **Done**: all `258` pass\nMore detail.")).toBe("Done: all 258 pass");
    expect(previewLine("> - quoted item")).toBe("quoted item");
  });
});
