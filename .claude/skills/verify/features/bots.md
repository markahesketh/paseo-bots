# Bots

A user creates a bot from scratch or from a role, names it, and picks the provider and model it chats with. The bot then appears in the Bots list, and its settings persist across reloads.

## Sub-features

- `bot-create-blank` creates an empty bot named `New bot` and opens its Identity settings.
- `bot-create-role` creates a bot from a role, such as `General assistant` (named `Assistant`, with standing instructions already filled in).
- `bot-rename` changes the name in Identity and updates the list, the composer placeholder and storage.
- `bot-model` sets the provider and model in the Model settings.
- `bot-persist` keeps all of the above after a page reload.

## How to get to it (user POV)

- Choose `New bot` on the `No bots yet` card, or `New bot` in the footer of the bot list.
- Open ⌘K and choose `New bot` (Command Center item).
- Open settings from a chat's `Back to bot settings` button (the panel at the right), then choose a section: `Overview`, `Identity`, `Soul`, `Skills`, `Playbooks`, `Memory`, `Routines`, `Access`, `Model`, `Permissions`, `History`, `Usage`.
- Choose `Bot actions` on a bot's row. The menu offers `Open bot settings` (it opens Identity), `Pin to top`, `Rename bot`, `Duplicate`, `Save as preset`, `Export`, `Copy bot ID`, `Archive bot` and `Delete bot`.

## Driving it with pbv

Preconditions:

- Baseline state from [the index](./README.md). No bots yet.

- **Open the picker.** Choose `New bot`. Run `$V act button "New bot"`. A dialog lists `Create Blank bot`, `Create General assistant`, `Create Email triage`, `Create Researcher`, `Create Community monitor`, `Create Operations`, and an `Import` box (`Bot or team file`).
- **Create blank.** Run `$V act button "Create Blank bot"`. The list shows the button `New bot`, and the composer is the textbox `Message New bot`. The settings panel shows Identity with the textbox `Name` set to `New bot`. `bots.json` gains one entry under `values.bots`, with `provider: "claude"` (the first ready provider, preferring Claude) and `model: null`.
- **Create from role.** Open the picker again and run `$V act button "Create General assistant"`. The list shows `Assistant`. The settings panel shows `Start`, `Summary` and `System prompt`, and the entry's `soul` is not empty.
- **Rename.** In Identity, take a fresh `$V browser snapshot -i`, then `$V browser fill @<Name ref> "Verify Bot"` and `$V browser press Tab`. The list button and the composer (`Message Verify Bot`) update, and the entry's `name` becomes `Verify Bot` within about a second.
- **Pick model.** Run `$V act button "Back to bot settings"`, then `$V act button "Model"`. The panel shows `Provider: Claude`, `Model: Default` and `Thinking: Default`. Run `$V act button "Model: Default"` and `$V act menuitem "Haiku 5.5"`. The button reads `Model: Haiku 5.5`, and the entry has `provider: "claude"` and `model: "claude-haiku-5-5"`.
- **Persist.** Run `$V browser reload`, then `$V act button "Bots"`. The bot and its settings are unchanged.
- **Proof.** `$V shot bots-created`, `$V shot bots-model`, and `python3 -m json.tool "$PASEO_HOME/plugin-settings/paseo-bots/bots.json" > "$EVIDENCE/bots.json"`.

## Gotchas

- A new bot takes its provider from the provider list loaded in the page. If the page loaded before the daemon's catalog was ready, the bot is saved with `provider: ""`. The Model section then shows `Provider: Choose a provider` and a disabled `Model: Choose a provider first`, and the composer shows `has no models available. Pick a model in the bot's settings.` and sends nothing. `$V launch` waits for the catalog, so this means the page went stale. Pick `Provider: Choose a provider` → `Claude`, or reload and create the bot again. This may be a real plugin bug, so report it if it happens after a ready launch.
- `New bot` appears twice when the list is empty: the card and the footer. Both open the same picker.
- The `Name` textbox lives under several wrappers. `act textbox "Name" fill …` can hit a `Name` field in an open sheet instead, so use a ref from a fresh snapshot.
- If the `Model: Default` menu lists only `Default`, the page loaded before the daemon's model catalog was ready, and the UI keeps that empty list. Waiting in place doesn't help. Run `$V browser reload`, reopen `Bots`, and go back to Model.
- Bot IDs (`bot-…`) are random. Read them from `bots.json`, and don't hard-code them.
