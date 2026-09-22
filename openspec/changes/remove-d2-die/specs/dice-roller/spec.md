## MODIFIED Requirements

### Requirement: Summoning dice
The tray SHALL let a person summon any number of dice, individually, in any
of these types: d4, d6, d8, d10, d12, d20 and d100 (a percentile die
resolved from a paired tens-die and units-die, shown and thrown as its own
single die). The tray SHALL support having multiple dice of the same type,
and multiple different types, present at once. Summoning a die SHALL place
it in the tray without a throw.

#### Scenario: Summoning adds a die without rolling it
- **WHEN** a person summons a die of any supported type
- **THEN** that die appears at rest in the tray and no roll happens

#### Scenario: Mixed dice can share the tray
- **WHEN** a person summons dice of different types, or several of the same type
- **THEN** all of them are present in the tray at once

## REMOVED Requirements

### Requirement: Reading each die's result
**Reason**: Replaced by "Reading each settled die's face value," which
drops the d2-specific face/cross/edge reading now that the d2 is gone.
**Migration**: No user-facing migration for the remaining kinds; a value
is still read from the settled resting face exactly as before.

## ADDED Requirements

### Requirement: Reading each settled die's face value
Once a die settles from a throw, the system SHALL determine its value from
the face it is resting on (for a d100, from its settled tens-die and
units-die pair) and display it next to that die.

#### Scenario: Every die shows its value
- **WHEN** a die settles from a throw
- **THEN** it shows the value of the face it landed on
