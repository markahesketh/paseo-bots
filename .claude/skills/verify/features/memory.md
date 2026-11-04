# Memory

A bot keeps a `MEMORY.md` it updates when it learns something worth keeping, and every new chat starts with it. In the bot's settings, the user reads and edits the file, browses the daily log, and undoes changes.

## Sub-features

- `memory-save` has the bot write a fact to `MEMORY.md` when asked to remember it.
- `memory-view` shows `MEMORY.md` with its size (`<n> of 200 lines · <x> of 24 KB loaded into every chat`) and the bot's folder path, with `Copy`.
- `memory-changes` lists each change (`<Bot> created MEMORY.md with <n> lines`) under `Changes`, with undo.
- `memory-log` lists the chat days under `Daily log`.
- `memory-topic` adds a topic file with `New topic file`.

## How to get to it (user POV)

- Tell the bot in a chat, for example "Remember that I prefer short answers".
- Open the bot's settings with `Back to bot settings`, then choose `Memory`.

## Driving it with pbv

Preconditions:

- The end state of [Chat](./chat.md): `Verify Bot` on Haiku 5.5, with one finished thread. The bot's folder has no `MEMORY.md` yet.

- **Remember.** In the same thread, run `$V act textbox "Message Verify Bot" fill "Remember that my favourite colour is teal. Then reply OK."` and `$V browser press Enter`, then `$V paseo wait <agent-id> --timeout 150`. The chat shows a `Read MEMORY.md` tool call (red `File does not exist` on the first save), then `Write MEMORY.md` and `OK`.
- **File.** Run `cat "$PASEO_HOME"/plugin-data/paseo-bots/shared/Bots/<bot-id>/MEMORY.md`. It contains `teal`. Copy it to `$EVIDENCE/memory-MEMORY.md`.
- **Settings view.** Run `$V act button "Back to bot settings"` and `$V act button "Memory"`. The panel shows `New topic file`, the button `MEMORY.md` (`5 of 200 lines`), the bot's folder with `Copy`, `Changes` (`1 change, with undo`) and `Daily log` (`1 day`). Run `$V shot memory-file`.
- **Changes.** Run `$V act button "Changes"`. A sheet `Memory changes` lists `Verify Bot created MEMORY.md with 4 lines`. Close it with `$V act button "Close"`.

## Gotchas

- The bot decides what to save and how to word it. Check for the fact (`teal`), not an exact line.
- The first save reads a missing file, so the red `ERROR` on `Read MEMORY.md` is expected. Don't report it as a failure.
- The `MEMORY.md` button opens an editor. The body text of the page doesn't include the file's content, so prove the content from the file on disk.
- Undo in `Changes` is not mapped yet. Map it before you report it verified.
