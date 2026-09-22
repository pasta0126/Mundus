## MODIFIED Requirements

### Requirement: Summoning dice
The tray SHALL let a person summon any number of dice, individually, in any
of these types: d2 (a two-sided "coin"), d4, d6, d8, d10, d12, d20 and d100
(a percentile die resolved from a paired tens-die and units-die, shown and
thrown as its own single die). The tray SHALL support having multiple dice
of the same type, and multiple different types, present at once. Summoning a
die SHALL place it in the tray without a throw.

#### Scenario: Summoning adds a die without rolling it
- **WHEN** a person summons a die of any supported type
- **THEN** that die appears at rest in the tray and no roll happens

#### Scenario: Mixed dice can share the tray
- **WHEN** a person summons dice of different types, or several of the same type
- **THEN** all of them are present in the tray at once

### Requirement: Reading each die's result
Once a die settles from a throw, the system SHALL determine its value from
the face it is resting on (for a d100, from its settled tens-die and
units-die pair) and display it next to that die. A d2 SHALL read 1 when
resting on its face side, 0 when resting on its cross side, and 2 when it
comes to rest balanced on its edge rather than either flat side.

#### Scenario: Every die shows its value
- **WHEN** a die settles from a throw
- **THEN** it shows the value of the face (or, for a d2, the side or edge) it landed on

#### Scenario: A coin can land on its edge
- **WHEN** a thrown d2 comes to rest balanced on its edge rather than on either flat side
- **THEN** its value is 2

## REMOVED Requirements

### Requirement: Roll total
**Reason**: Replaced by "Live roll total," which keeps a total from every
die's own last-thrown value instead of one shared per-roll batch, now that
a single die can be thrown on its own without a whole-tray roll.
**Migration**: No user-facing migration; the total shown behaves the same
way after any whole-tray "Roll," and now also updates after a single die
is thrown on its own.

## ADDED Requirements

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
matching a real d4's look); a d100 pair's tens die and units die SHALL be
printed in two different shades (one dark, one light) so the two are told
apart at a glance. Every printed 6 and every printed 9 SHALL carry a
distinguishing mark (an underline) so the two can never be confused for one
another. Every die's surface SHALL carry a subtle marbled texture in
addition to its base colour.

#### Scenario: A d6 shows pips, not a digit
- **WHEN** a d6 is summoned
- **THEN** each of its faces shows the traditional dot pattern for its value, not a printed digit

#### Scenario: Other dice show their numeral
- **WHEN** a d4, d8, d10, d12 or d20 is summoned
- **THEN** every eligible face shows its printed value

#### Scenario: 6 and 9 are told apart
- **WHEN** a die shows a printed 6 or a printed 9
- **THEN** that numeral carries an underline distinguishing it from the other

#### Scenario: A d100 pair reads unambiguously
- **WHEN** a d100 is summoned
- **THEN** its tens die's numerals are a dark shade and its units die's numerals are a light shade

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
