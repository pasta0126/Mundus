# dice-roller Specification

## Purpose
Let a person summon one or more dice into a 3D tray with realistic physics,
throw them all in a single roll, and read off each die's value and the
throw's total once every die has settled.

## Requirements

### Requirement: Dice tray route
The system SHALL serve a dice tray page at `/dice`, showing an enclosed 3D
tray (floor and walls) empty of dice until at least one is summoned.

#### Scenario: Opening the page shows an empty tray
- **WHEN** a person opens `/dice`
- **THEN** an empty 3D tray is shown and no die is summoned automatically

### Requirement: Summoning dice
The tray SHALL let a person summon any number of dice, individually, in any
of these types: d2 (a two-sided "coin"), d3 (a triangular prism), d4, d6, d8,
d10, d12, d20 and d100 (a percentile die resolved from a paired tens-die and
units-die, shown and thrown as its own single die). The tray SHALL support
having multiple dice of the same type, and multiple different types, present
at once. Summoning a die SHALL place it in the tray without a throw.

#### Scenario: Summoning adds a die without rolling it
- **WHEN** a person summons a die of any supported type
- **THEN** that die appears at rest in the tray and no roll happens

#### Scenario: Mixed dice can share the tray
- **WHEN** a person summons dice of different types, or several of the same type
- **THEN** all of them are present in the tray at once

### Requirement: Removing dice from the tray
The tray SHALL let a person remove an individual die, or clear every die at
once, while no roll is in progress.

#### Scenario: Clearing the tray removes every die
- **WHEN** a person clears the tray
- **THEN** no die remains in it

### Requirement: Realistic physics simulation
Every die in the tray SHALL be a rigid body subject to a physics simulation
with gravity, collisions between dice, and collisions with the tray's floor
and walls, so a thrown die tumbles and bounces before coming to rest, rather
than snapping to a result. Two dice SHALL NOT overlap or pass through each
other or the tray's floor or walls.

#### Scenario: A thrown die tumbles before settling
- **WHEN** a die is thrown
- **THEN** it visibly tumbles and may bounce off the tray's walls, floor, or other dice before coming to rest

#### Scenario: Dice do not overlap
- **WHEN** any number of dice are in the tray, thrown or at rest
- **THEN** no two dice occupy overlapping space, and no die passes through the tray's floor or walls

### Requirement: One roll throws every die in the tray
A single roll action SHALL apply a throw - an initial impulse and rotation -
to every die currently in the tray, as one physics event, not one die at a
time.

#### Scenario: Rolling throws all dice at once
- **WHEN** the tray holds more than one die and the roll action is used
- **THEN** every die in the tray is thrown as part of that same roll

#### Scenario: Rolling with no dice does nothing
- **WHEN** the roll action is used while the tray is empty
- **THEN** no roll happens

### Requirement: Each roll is independently random
Each roll's outcome SHALL come from the physics simulation, not from a seed
or a stored value, so repeated rolls are not reproducible and no two rolls
are guaranteed to produce the same result even from what looks like the same
starting arrangement.

#### Scenario: Repeated rolls are not forced to match
- **WHEN** the same dice are rolled more than once
- **THEN** nothing in the system forces the results to repeat

### Requirement: Dice settle before results are read
The system SHALL wait until every thrown die has come to rest (negligible
velocity and rotation) before reading its result, and SHALL enforce a
maximum wait after which any die still moving is settled into a stable
resting face on its own, so a roll always finishes.

#### Scenario: Results wait for every die to stop
- **WHEN** a roll is in progress and at least one die is still moving
- **THEN** no result is reported yet

#### Scenario: A stuck die still resolves
- **WHEN** a thrown die has not come to rest by the maximum wait
- **THEN** the system settles it onto a stable face so the roll still finishes

### Requirement: Reading each die's result
Once every die from a roll has settled, the system SHALL determine each
die's value from the face it is resting on (for a d100, from the settled
tens-die and units-die pair) and display it next to that die.

#### Scenario: Every die shows its value
- **WHEN** a roll finishes
- **THEN** each die involved in that roll shows the value of the face it landed on

### Requirement: Roll total
Once every die from a roll has settled, the system SHALL display the sum of
every die's value from that roll, including dice of different types summed
together, with the d100 pair contributing its combined value.

#### Scenario: The total sums every die in the roll
- **WHEN** a roll of several dice, of one or more types, finishes
- **THEN** the displayed total equals the sum of every one of those dice's values

### Requirement: A new roll re-throws only dice still in the tray
Dice removed or cleared before a roll SHALL NOT be part of that roll or its
total. A die summoned after a roll has settled SHALL remain at rest until
the next roll.

#### Scenario: Removed dice are excluded from the next roll
- **WHEN** a die is removed and the remaining dice are rolled
- **THEN** neither the removed die's value nor a value for it appears in the results or the total

### Requirement: English text
Every piece of user-facing text on the dice tray page SHALL be in English.

#### Scenario: All text is English
- **WHEN** the dice tray page is shown
- **THEN** all its labels, buttons, and messages are in English
