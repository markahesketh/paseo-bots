# Routines

A user gives a bot a routine: a named prompt that runs as a new chat on a schedule, once, or when its webhook is called. The user can run it on demand, pause and resume it, and see upcoming and recent runs.

## Sub-features

- `routine-create` creates a routine with a name, prompt, cadence and results chat.
- `routine-run-now` starts a run at once (trigger `manual`) and records its output.
- `routine-runs` lists `Upcoming` and `Recent runs` under `Runs`.
- `routine-pause` pauses and resumes a routine (`enabled` flips).
- `routine-delete` removes it.
- `routine-webhook` (cadence `When its webhook is called`, `Copy webhook URL`) is not mapped yet.

## How to get to it (user POV)

- In the bot's settings, choose `Routines`, then `New routine`.
- Ask the bot in a chat, then choose `Create routine` on its card. That path is not mapped yet.

## Driving it with pbv

Preconditions:

- `Verify Bot` on Haiku 5.5 (see [Bots](./bots.md)), with its settings panel open.

- **Open form.** Run `$V act button "Back to bot settings"`, `$V act button "Routines"` and `$V act button "New routine"`. A sheet shows the textboxes `Name` and `Prompt`, the button `Repeats: Weekdays 9:00`, the textbox `Cron` (`0 9 * * 1-5`), the button `Post results to: Only the run's own chat`, `Cancel`, and the disabled button `Create routine`.
- **Cadence options.** Click `Repeats: Weekdays 9:00`. The menu lists `Every minute`, `Every hour`, `Daily 9:00`, `Weekdays 9:00`, `Mondays 9:00`, `Once` and `When its webhook is called`. Press `Escape` to keep the default.
- **Create.** Fill the sheet's `Name` ref (fresh snapshot) with `Verify routine`, run `$V act textbox "Prompt" fill "Reply with exactly ROUTINE-OK"`, then `$V act button "Create routine"`. The section shows `Edit routine Verify routine`, `Routine actions` and `Runs`. The bot's entry in `bots.json` has `routines[0]` with `schedule: {kind: "cron", expression: "0 9 * * 1-5"}` and `enabled: true`.
- **Run now.** Run `$V act button "Routine actions"` and `$V act menuitem "Run now"`. `$V paseo ls` gains an agent named `Verify routine`, and the bot list gains the thread `Verify routine`. After `$V paseo wait <agent-id>`, `plugin-data/paseo-bots/routines.json` has a run with `trigger: "manual"`, `status: "succeeded"` and `output: "ROUTINE-OK"`.
- **Runs.** Run `$V act button "Runs"`. The sheet shows `Upcoming` (the next weekday at 09:00) and `Recent runs` with `Verify routine`. Run `$V shot routines-run`.
- **Pause.** Open `Routine actions` and choose `Pause routine`. The routine's `enabled` becomes `false`, and the menu now offers `Resume routine`.
- **Proof.** Copy `routines.json` and `bots.json` into `$EVIDENCE`.

## Gotchas

- `Every minute` really fires every minute, with one real agent turn each time. Use `Run now` to prove a run, and pause or delete the routine before you leave the run idle.
- Run records live in `plugin-data/paseo-bots/routines.json`, keyed by routine ID. The routine's definition lives in `bots.json`.
- The routine sheet's `Name` textbox clashes with Identity's `Name`. Use a ref.
