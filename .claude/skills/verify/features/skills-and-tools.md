# Skills & Tools

A user keeps one library of skills and MCP servers and turns each one on per bot. A skill written in the library is saved as a `SKILL.md` that bots can load.

## Sub-features

- `skill-new` writes a new skill (name, when to use it, instructions).
- `skill-import` imports skills from GitHub (`owner/repo`, a folder, or a `SKILL.md` link). Not mapped yet, because it needs network access.
- `skill-assign` turns a library skill on for a bot.
- `skill-toggle` turns a skill off or on for every bot (`Enabled`).

## How to get to it (user POV)

- Choose `Skills & Tools` at the bottom of the bot list. `Back to bots` returns.
- In the library, choose `Add skill`, then `New skill` or `Import skills`.
- In a bot's settings, open `Skills`.

## Driving it with pbv

Preconditions:

- At least one bot exists (`Assistant` from [Bots](./bots.md)). No skill named `verify-skill` exists.

- **Open library.** Run `$V act button "Skills & Tools"`. The screen shows `Search skills and tools`, `Add skill`, `Add MCP server`, `Set up connected apps`, and the heading `Connected apps` with a `Project API key` textbox.
- **New skill.** Run `$V act button "Add skill"` and `$V act menuitem "New skill"`. A sheet shows the textboxes `Name`, `When to use it` and `Instructions`, and the disabled button `Create skill`.
- **Fill and create.** Take a fresh `$V browser snapshot -i`. Fill `Name` with `verify-skill`, `When to use it` with `Use when asked to verify`, and `Instructions` with `Say VERIFIED.`. Then run `$V act button "Create skill"`. A toast reads `Added verify-skill`. The heading `verify-skill` shows the switches `Enabled` (on) and `Use in Assistant` (off), plus `Edit` and `Delete`. `$PASEO_HOME/plugin-data/paseo-bots/library/skills/verify-skill/SKILL.md` exists.
- **Assign.** Run `$V act switch "Use in Assistant"`. The switch is checked, and `skillIds` on the bot's entry in `bots.json` contains the skill.
- **Proof.** `$V shot skills-created`, then `cp "$PASEO_HOME/plugin-data/paseo-bots/library/skills/verify-skill/SKILL.md" "$EVIDENCE/"`.

## Gotchas

- Skill names allow lowercase letters, numbers and dashes only. `Create skill` stays disabled otherwise.
- Imported skills stay off until you open one and choose `Review`. Skills written in the app don't need that.
- The `Name` textbox clashes with other `Name` fields. Use refs.
