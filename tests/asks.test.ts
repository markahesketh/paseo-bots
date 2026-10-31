import { describe, expect, it } from "vitest";
import { canAsk, chainPrompt, formatAskPath, mayFollowUp, mayRead, mayTarget, parseAskPath, type AskPath } from "../shared/asks";

const a1 = "0b6c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d";
const b1 = "1c7d2e3f-4a51-4b6c-9d7e-8f9a0b1c2d3e";
const c1 = "2d8e3f40-5b62-4c7d-ae8f-9a0b1c2d3e4f";
const path: AskPath = [
  { botId: "a", chatId: a1 },
  { botId: "b", chatId: b1 },
];

describe("ask paths", () => {
  it("round-trips through one label", () => {
    const label = formatAskPath(path);
    expect(label).toBe(`a@${a1},b@${b1}`);
    expect(parseAskPath(label)).toEqual(path);
    expect(parseAskPath(undefined)).toEqual([]);
    expect(parseAskPath("")).toEqual([]);
    expect(() => parseAskPath("a@b@c")).toThrow("Unreadable ask path");
    expect(() => formatAskPath([{ botId: "a,b", chatId: a1 }])).toThrow("can't go in an ask path");
  });

  it("limits who may ask, be asked, read and follow up", () => {
    const bot = { contactBots: "ask" as const };
    expect(canAsk(bot, path)).toBe(true);
    expect(canAsk(bot, [...path, { botId: "c", chatId: c1 }, { botId: "d", chatId: "d1" }])).toBe(false);
    expect(canAsk({ contactBots: "off" }, [])).toBe(false);

    expect(mayTarget({ botId: "c", path }, "d")).toBe(true);
    expect(mayTarget({ botId: "c", path }, "a")).toBe(false);
    expect(mayTarget({ botId: "c", path }, "c")).toBe(false);

    expect(mayRead("a", { botId: "c", path })).toBe(true);
    expect(mayRead("c", { botId: "c", path })).toBe(true);
    expect(mayRead("d", { botId: "c", path })).toBe(false);

    expect(mayFollowUp(a1, path)).toBe(true);
    expect(mayFollowUp(b1, path)).toBe(true);
    expect(mayFollowUp(c1, path)).toBe(false);
  });

  it("tells an asked chat its place in the chain", () => {
    expect(chainPrompt([{ ...path[0]!, name: "Chief" }, { ...path[1]!, name: "Scout" }])).toBe(
      "You're 3rd in Chief → Scout → you. You can't ask Chief or Scout. Your reply here goes back to Scout automatically; make it the answer to its question.",
    );
    expect(chainPrompt([{ ...path[0]!, name: "Chief" }])).toContain("You're 2nd in Chief → you. You can't ask Chief.");
  });
});
