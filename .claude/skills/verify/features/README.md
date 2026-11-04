# paseo-bots verification map

This directory is the maintained list of user-facing paseo-bots behavior to verify. Read this index before you drive the app. Then follow the matching feature file as the recipe. Every command uses the `pbv` helper from [`../SKILL.md`](../SKILL.md), set up as `V=.claude/skills/verify/bin/pbv` and run from the repo root.

## Baseline preconditions

- `$V launch` reported `ready` for this run, and `$V doctor` prints only `ok`.
- The run's home is empty: no bots, no teams, no projects, no skills, and no Composio key.
- `$V open` loaded the web UI, and `$V act button "Bots"` shows the Bots surface. With no bots, the surface shows `No bots yet` and the `New bot` button.
- Never drive the user's own Paseo at `127.0.0.1:6767` or `~/.paseo`.

## Driving conventions

- Start every recipe from the baseline, or from the end state of the recipe it names under `Preconditions`.
- Select by role and exact accessible name with `$V act <role> "<name>" [click|fill|check] [text]`, which retries while the UI renders. Use an `@ref` only from a fresh `$V browser snapshot -i`, and only when a name appears twice.
- Read stored state from files and the CLI, never by changing them. The paths are in the data table in [`../SKILL.md`](../SKILL.md#drive). Load them with `eval "$($V env | sed 's/^/export /')"`.
- Set a chat bot to `Claude` and `Haiku 5.5` before you send anything (see [Bots](./bots.md), `bot-model`).

## Proof and skip reporting

- Capture the user action and the resulting state with `$V shot <feature>-<step>` before and after the step that matters.
- Back a mutation with a second, read-only view: the `bots.json` entry, a file in the bot's folder, or `$V paseo ls` / `$V paseo logs`. Copy that view into `$EVIDENCE`.
- Record the feature ID, the entry point you used, the run ID and `REVISION` with every artifact.
- When an entry point can't be reached, report the command you ran and the precondition that was missing. Don't report a skipped entry point as verified through another path.

## Feature entry contract

Each feature file starts with an H1 title and one paragraph that describes the user-visible behavior. Four H2 sections follow, in this order: `Sub-features`, `How to get to it (user POV)`, `Driving it with pbv`, and `Gotchas`. The driving section starts with `Preconditions:`, and each of its bullets pairs a user action with an exact command and an observable result.

## Features

- [Bots](./bots.md) covers creating a bot from blank or a role, renaming it, and choosing its provider and model.
- [Chat](./chat.md) covers sending a message, the streamed reply, the chat thread list, and the daily log entry.
- [Memory](./memory.md) covers a bot saving to `MEMORY.md`, the Memory settings view, and the daily log.
- [Routines](./routines.md) covers creating, running, pausing and deleting a scheduled routine.
- [Teams](./teams.md) covers creating a team with a Chief of Staff and the team tab it adds.
- [Skills & Tools](./skills-and-tools.md) covers writing a library skill and turning it on for a bot.

Not mapped yet: Connected apps (needs a Composio `ak_` key), MCP servers, `/learn`, bot-made setup proposals (`Apply changes` cards), import and export of bot and team files, and webhook routines.
