# Chat

A user sends a message to a bot and gets a streamed reply in the bot's chat. Each chat is a thread under the bot in the list, runs as a Paseo agent in the bot's folder, and adds a line to the bot's daily log.

## Sub-features

- `chat-send` sends from the composer with Enter or `Send message`.
- `chat-reply` streams the reply and ends with `Worked for <n>s`.
- `chat-thread` lists the chat under the bot, titled from the first message, with status `Ready to review` once it finishes.
- `chat-agent` runs as a Paseo agent with the bot's provider and model, in `shared/Bots/<bot-id>/`.
- `chat-log` appends `- HH:MM · from chat "<title>" · <reply>` to `memory/log/<YYYY-MM-DD>.md`.
- `chat-new` starts another thread with `New chat` or `New chat with <Bot>`.

## How to get to it (user POV)

- Choose a bot in the list. The composer is the textbox `Message <Bot name>`.
- Choose `New chat with <Bot name>` on the bot's row, or `New chat` under it.
- Open ⌘K and choose `Open Bots`, then a bot.

## Driving it with pbv

Preconditions:

- A bot named `Verify Bot` with `provider: "claude"` and `model: "claude-haiku-5-5"`. Use the `bot-create-blank`, `bot-rename` and `bot-model` steps in [Bots](./bots.md).
- `eval "$($V env | sed 's/^/export /')"` has run, so `$PASEO_HOME` and `$EVIDENCE` are set.

- **Before.** Run `$V shot chat-1-before-send`. The composer `Message Verify Bot` is empty, and no alert about models shows.
- **Send.** Run `$V act textbox "Message Verify Bot" fill "Reply with exactly the word PONG and nothing else."` and `$V browser press Enter`. The message bubble appears, and the list gains a thread button that starts `Reply with exactly the word PONG`.
- **Agent.** Run `$V paseo ls`. One agent named after the message runs `claude/claude-haiku-5-5`, with CWD `…/plugin-data/paseo-bots/shared/Bots/<bot-id>`. Run `$V paseo wait <agent-id> --timeout 120`.
- **Reply.** Run `$V browser wait --text "Worked for"` and `$V shot chat-2-reply`. The chat shows `PONG` under the message, and the thread button's name ends with `, Ready to review`.
- **Transcript.** Run `$V paseo logs <agent-id> > "$EVIDENCE/chat-transcript.txt"`. It contains `[User] Reply with exactly the word PONG and nothing else.` followed by `PONG`.
- **Daily log.** Run `cp "$PASEO_HOME"/plugin-data/paseo-bots/shared/Bots/<bot-id>/memory/log/*.md "$EVIDENCE/chat-daily-log.md"`. It holds one line: `- HH:MM · from chat "Reply with exactly the word PONG and nothing else." · PONG`.

## Gotchas

- With `provider: ""` the composer shows `has no models available. Pick a model in the bot's settings.`, and Enter does nothing. Without a model the chat can't run, and that is a failed precondition, not a chat bug.
- A Paseo agent in the run's daemon carries the chat, so `$V paseo ls` shows it in Paseo's own list too. Under `Workspaces` in Paseo's sidebar, the project `Bots` appears with the bot under it.
- Replies run with the bot's approval mode (`auto` on a fresh bot), so the bot can read and write files in its folder without a permission prompt.
- `$V paseo wait` returns when the agent is idle. The UI can lag by a moment, so wait for `Worked for` before the shot.
- A follow-up in the same thread reuses the same agent ID.
