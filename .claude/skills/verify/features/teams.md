# Teams

A user groups bots into a team with a Chief of Staff (the lead) and shared instructions. The team gets a pixel-art logo and its own tab on the Bots screen.

## Sub-features

- `team-create` creates a team with a name, members, a lead, and optional shared instructions.
- `team-tab` adds a tab for the team above the bot list, plus `New team` (`+`) next to the tabs.
- `team-logo` rerolls or uploads the logo, or picks one of 12 colours.
- `team-edit` reopens the team from the Team map with `Edit`.

## How to get to it (user POV)

- Choose `Team map` at the bottom of the bot list, then `New team`.
- Once a team exists, choose `New team` (`+`) next to the team tabs.
- Right-click a team tab to edit it (desktop only).

## Driving it with pbv

Preconditions:

- At least one bot exists. Run the `bot-create-role` step in [Bots](./bots.md), which gives you `Assistant`.

- **Open Team map.** Run `$V act button "Team map"`. The panel shows `New team`, twice when no team exists.
- **Open form.** Run `$V act button "New team"`. A sheet shows the textbox `Name`, `Reroll`, `Upload`, the radios `Automatic colour` and `Colour 1` to `Colour 12`, the textbox `Image URL`, one switch per bot (here `Assistant`), the disabled button `Lead: None`, the textbox `Shared instructions`, the textbox `Replies in a row` (`10`), `Cancel`, and the disabled button `Create team`.
- **Fill.** Take a fresh `$V browser snapshot -i`. Fill the sheet's `Name` ref with `Verify team`, then click the `Assistant` switch ref. `Lead: None` becomes enabled. Click it, then run `$V act menuitem "Assistant"`.
- **Create.** Run `$V act button "Create team"`. The Bots screen gains the tab `Verify team`, and the Team map shows `Edit` and `Open Assistant`. `bots.json` has `values.groups[0]` with `name: "Verify team"`, and the bot's ID in both `leadId` and `memberIds`.
- **Proof.** `$V shot teams-created` and copy `bots.json` into `$EVIDENCE`.

## Gotchas

- Teams are stored as `groups` in `bots.json`, not `teams`.
- `Lead` stays disabled until at least one member switch is on.
- The sheet's `Name` textbox has the same name as a bot's Identity `Name`. Use a ref from a fresh snapshot.
- Sending to the Chief of Staff hands work to teammates through real agent turns, one per bot. Keep members on `Haiku 5.5` and lower `Replies in a row` if you test delegation.
