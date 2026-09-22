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

### Requirement: Reading each settled die's face value
Once a die settles from a throw, the system SHALL determine its value from
the face it is resting on (for a d100, from its settled tens-die and
units-die pair) and display it next to that die.

#### Scenario: Every die shows its value
- **WHEN** a die settles from a throw
- **THEN** it shows the value of the face it landed on

### Requirement: Live roll total
The system SHALL display the sum of every die's most recently thrown value
among the dice currently in the tray, updating it whenever a die settles
from any throw - the whole tray's "Roll" or a single die thrown on its own.
A die never yet thrown SHALL NOT be counted. Dice of different types are
summed together, with the d100 pair contributing its combined value.

#### Scenario: The total sums every settled die in the tray
- **WHEN** every die currently in the tray has been thrown at least once
- **THEN** the displayed total equals the sum of all of their most recent values

#### Scenario: An unthrown die is not counted
- **WHEN** a die is summoned after others have already been thrown
- **THEN** the total does not include it until it has been thrown at least once

#### Scenario: Throwing one die updates the total
- **WHEN** a single die is thrown on its own and settles on a new value
- **THEN** the displayed total is recomputed using that die's new value and every other die's last known value

### Requirement: Numbers are marked on every die
Every die SHALL carry its face values as visible markings, not only in a
results display: a d6 SHALL show the traditional arrangement of dots (pips)
for 1 through 6; a d4, d8, d10, d12 and d20 SHALL each show its printed
numeral on every eligible face (a d4's positioned near that face's base,
matching a real d4's look). Every marking's ink colour SHALL be chosen
(dark or light) for contrast against that specific die's own base colour,
so it stays legible whatever colour the die was given. Every printed 6 and
every printed 9 SHALL carry a distinguishing mark (an underline) so the two
can never be confused for one another. Every die's surface SHALL carry a
subtle marbled texture in addition to its base colour.

#### Scenario: A d6 shows pips, not a digit
- **WHEN** a d6 is summoned
- **THEN** each of its faces shows the traditional dot pattern for its value, not a printed digit

#### Scenario: Other dice show their numeral
- **WHEN** a d4, d8, d10, d12 or d20 is summoned
- **THEN** every eligible face shows its printed value

#### Scenario: 6 and 9 are told apart
- **WHEN** a die shows a printed 6 or a printed 9
- **THEN** that numeral carries an underline distinguishing it from the other

#### Scenario: Markings stay legible on any colour
- **WHEN** a die is given a light base colour or a dark one
- **THEN** its markings' ink is dark on a light colour and light on a dark one

### Requirement: Each die has its own colour and an editable name
Each die summoned SHALL be given a base colour drawn from a curated palette,
rotating so consecutively summoned dice of the same kind differ from one
another where the palette allows. The tray SHALL show, for each die, a
colour control pre-filled with its assigned colour that a person can change
to any colour, and a text label next to its fixed kind name (e.g. "D6") that
a person can edit freely (e.g. "D6 Attack"); the kind name itself SHALL
remain and SHALL NOT be replaced by the edited label.

#### Scenario: Freshly summoned dice of a kind differ in colour
- **WHEN** two dice of the same kind are summoned one after another
- **THEN** they are assigned two different base colours from the palette

#### Scenario: A die's colour can be changed
- **WHEN** a person changes a die's colour control
- **THEN** that die's colour in the tray updates to the chosen colour

#### Scenario: A die can be named without losing its kind label
- **WHEN** a person types a label next to a die's kind name
- **THEN** the tray shows both the kind name and the label together (e.g. "D6 Attack")

### Requirement: A single die can be thrown on its own
A die SHALL be throwable by itself - from a control on its tray row, or by
clicking or tapping it directly in the 3D tray - independently of the
"Roll" action that throws every die in the tray together. Throwing one die
SHALL NOT disturb any other die beyond ordinary physics (a thrown die may
collide with others already in the tray). A die already airborne from a
throw SHALL NOT be throwable again until it settles.

#### Scenario: A tray control throws just that die
- **WHEN** a person uses a single die's throw control
- **THEN** only that die is thrown, and every other die in the tray is left as it was (aside from any collision the thrown die causes)

#### Scenario: Clicking a die throws it
- **WHEN** a person clicks or taps a die at rest in the 3D tray
- **THEN** that die is thrown on its own

#### Scenario: An airborne die cannot be re-thrown mid-roll
- **WHEN** a die is still settling from a throw
- **THEN** it cannot be thrown again until it comes to rest

### Requirement: Shaking a touch device rolls the tray
On a device that exposes motion sensors, physically shaking it SHALL throw
every die currently in the tray, the same as using the "Roll" action.

#### Scenario: A shake throws the whole tray
- **WHEN** the device is shaken while the tray holds at least one die and no roll is already in progress
- **THEN** every die in the tray is thrown, as if the "Roll" action had been used

### Requirement: Roll history
The system SHALL keep a history of the last 100 throw events (the whole
tray's "Roll", or a single die thrown on its own), each recording the date
and time it settled, every die involved with its kind, its tray label (if
any) and its value, and that event's total. The history SHALL persist in
the person's browser across page reloads, oldest entries dropped first
once the count exceeds 100. The system SHALL let the person download the
full history as a JSON file, including each entry's date and time.

#### Scenario: A finished throw is added to the history
- **WHEN** any throw (the whole tray or a single die) settles
- **THEN** a new entry recording its dice, their values, its total and the current date and time is added to the history

#### Scenario: The history is capped at 100
- **WHEN** a 101st throw event is recorded
- **THEN** the oldest entry is dropped so the history holds at most 100

#### Scenario: The history survives a reload
- **WHEN** the page is reloaded
- **THEN** the roll history from before the reload is still present

#### Scenario: The history can be downloaded
- **WHEN** the person downloads the history
- **THEN** a JSON file is produced containing every kept entry with its dice, values, total and date/time

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
