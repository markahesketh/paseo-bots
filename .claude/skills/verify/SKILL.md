---
name: verify
description: Drive the paseo-bots Paseo plugin the way a user does — launch a throwaway Paseo daemon with this checkout installed, open its web UI in a headless browser, create bots, chat with them, and capture screenshots plus the files the plugin wrote. Use to prove a paseo-bots UI or daemon change works end to end, to reproduce a bug in the Bots surface, or before reporting any user-visible behavior as done.
---

# Verify paseo-bots

paseo-bots is a Paseo plugin. A user reaches it from the **Bots** item in Paseo's sidebar. Every check here runs against a **throwaway daemon**: its own `PASEO_HOME`, its own port (6800-6899), relay off, bundled web UI on, and this checkout installed as a local plugin. The user's own Paseo (`~/.paseo`, port 6767) runs the agent you are talking to. Never install, reload, restart or stop anything there, and never point the browser at it.

The helper is `.claude/skills/verify/bin/pbv` (path relative to the repo root). Every command below runs from the repo root. `pbv` keeps per-run state in `~/.cache/paseo-bots-verify/runs/<run-id>/` and acts on the latest run unless `PBV_RUN=<run-id>` is set. `PBV_ROOT` moves the whole cache.

```bash
V=.claude/skills/verify/bin/pbv
```

Requirements: `paseo` CLI ≥ 0.13 on `PATH` (tested 0.13.2), `agent-browser` on `PATH` (tested 0.39.1), `python3`, `lsof`, and a working `claude` provider login for any feature that sends a chat.

## Launch

```bash
$V launch            # installs the checkout that contains this skill
$V launch /abs/path  # or another paseo-bots checkout, such as a worktree under review
```

This creates the run directory, writes the daemon config, runs `paseo daemon start`, runs `paseo plugin install <checkout>`, and then waits up to 60 seconds. Ready means `paseo-bots` reports `running` and the web UI answers. The command prints:

```
ready: run <run-id>, http://127.0.0.1:<port>/, source <checkout> @ <short-sha>
evidence: ~/.cache/paseo-bots-verify/runs/<run-id>/evidence
```

Each launch starts from an empty home: no bots, no projects, no default provider. Nothing needs installing first. Paseo bundles the plugin source itself, and the plugin has no runtime dependencies. Run `npm install && npm run typecheck` only when you are checking types.

The plugin loads from the checkout directly. After you edit source, reload it in place with `$V paseo plugin reload paseo-bots`, then reload the browser page with `$V browser reload`. Don't relaunch.

Several runs can live side by side. Each one gets the next free port and its own browser session (`pbv-<run-id>`).

## Doctor

Run it first, and again whenever anything looks off:

```bash
$V doctor
```

It is read-only. Each check prints `ok` or `FAIL`, and the command exits 1 on any failure. It checks that the home is not `~/.paseo`, the daemon in `paseo.pid` is alive, the port is held by that daemon (the listener is its worker child), `/api/health` answers, the web UI is served, `paseo-bots` is `running` from the expected checkout, and the checkout is still at the revision it was launched with. If the revision check fails, someone moved HEAD: reload the plugin or relaunch before you trust a result. For load errors, run `$V paseo plugin logs paseo-bots`.

## Drive

The surface is the Paseo web app, served by the throwaway daemon. `pbv act <role> "<exact name>" [click|fill|check] [text]` clicks or fills the first element with that role and exact accessible name, and retries for up to `PBV_WAIT` seconds (default 15) while the UI renders. `pbv browser …` is `agent-browser …` bound to this run's browser session, for snapshots, refs, keys and reloads. `pbv paseo …` is the `paseo` CLI bound to this run's home.

```bash
$V open                                              # load the run's web UI
$V act button "Bots"                                 # open the plugin surface
$V act button "New bot"
$V act button "Create Blank bot"
$V browser snapshot -i                               # list interactive elements with refs
$V act textbox "Message New bot" fill "hello"
$V browser press Enter
$V paseo ls                                          # the agents bot chats started
$V paseo wait <agent-id> --timeout 120               # block until a reply finishes
$V paseo logs <agent-id>                             # transcript as the daemon saw it
```

Rules:

- Select by role and accessible name. The names are listed per feature in [`features/`](features/README.md). Use `pbv act` rather than a bare `browser find`: a bare find fails if the panel hasn't rendered yet, and chained finds race the UI. Refs like `@e12` change on every snapshot, so take a fresh `snapshot -i` before you use one.
- Several labels appear twice, such as `New bot` (empty-state card and footer), `New team` (Team map), and `Name` (Identity and every sheet). `act` uses the first match. If you need another one, use a ref: `$V browser fill @e42 "text"`.
- Settings sections are named after their title (`Model`, `Memory`, …). Their dropdowns are named `<Label>: <current value>`, such as `Model: Default`, so the name changes once you pick a value.
- For a textbox, `act textbox "<name>" fill "<text>"` works. A CSS `textbox[name=…]` selector does not match.
- After an action, wait for the element or file you expect. A fixed sleep is only a last resort.
- If `PASEO_HOME` is exported (after `eval "$($V env …)"`), a bare `paseo` also targets the run's daemon. To check the user's own daemon, pass `--home ~/.paseo` explicitly.

The plugin's data lives in the run's home:

| What | Where (under `$PASEO_HOME`, see `$V env`) |
| --- | --- |
| Bots, teams, routines, UI prefs | `plugin-settings/paseo-bots/bots.json` (`values.bots`, `values.groups`) |
| A bot's folder: `MEMORY.md`, topic files, daily log | `plugin-data/paseo-bots/shared/Bots/<bot-id>/` (`memory/log/<YYYY-MM-DD>.md`) |
| Skill library | `plugin-data/paseo-bots/library/skills/<name>/SKILL.md` |
| Routine runs, webhooks, proposals, Composio relay | `plugin-data/paseo-bots/{routines,webhooks,proposals,composio}.json` |
| Bot chats (agents) | `$V paseo ls`; agent CWD is the bot's folder |

## Evidence

```bash
$V shot <feature>-<step>   # writes evidence/<name>.png and evidence/<name>.aria.txt
$V env                     # prints RUN_ID, PASEO_HOME, URL, SOURCE, REVISION, EVIDENCE
eval "$($V env | sed 's/^/export /')"   # load them into your shell
```

Proof standards:

- Drive the real user path: sidebar → Bots → buttons, menus and composer. Don't call plugin RPCs, write `bots.json` by hand, or start agents with `paseo run` to stand in for a UI action.
- Capture the action and its result. Take a shot before and after the step that matters, not only the final screen.
- Check side effects next to what is visible: the `bots.json` entry, the file in the bot's folder, the agent in `$V paseo ls`, the transcript in `$V paseo logs`. Save them into the evidence directory, for example `python3 -m json.tool "$PASEO_HOME/plugin-settings/paseo-bots/bots.json" > "$EVIDENCE/bots.json"`.
- Chats run a real provider (`claude`) under your own login. Pick **Haiku 5.5** in the bot's **Model** settings and use one-word replies to keep runs cheap and fast. Don't mock the provider. Composio (Connected apps) is a real external service, so don't fake it either. If no key is available, report the feature as unverified.
- Record the run ID, `SOURCE` and `REVISION` from `$V env` with every claim.

## Cleanup

```bash
$V cleanup
```

This closes the run's browser session and stops the run's daemon (`paseo daemon stop` on its home). It records the daemon's descendant processes first (worker, plugin subprocess, agents) and kills any that outlive the stop. It then deletes `home/`, and keeps `evidence/`, `run.env` and `launch.log`. It never touches `~/.paseo`, and it never kills by process name. Run it after every attempt, including failed ones. Evidence survives at `~/.cache/paseo-bots-verify/runs/<run-id>/evidence`. `$V runs` lists past runs. To delete old proof, remove its run directory yourself.

## Features

[`features/README.md`](features/README.md) indexes the per-feature recipes: bots, chat, memory, routines, teams, and skills & tools. Read the matching file before you drive a feature, and update it when the UI changes. Use `/maintain-verification-skill` for that.
