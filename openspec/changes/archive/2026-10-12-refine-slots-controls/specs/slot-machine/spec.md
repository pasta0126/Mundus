## MODIFIED Requirements

### Requirement: Three or five reels in a single row
The slot machine SHALL offer exactly two sizes, 3 reels and 5 reels, always in a single row. The person SHALL be able to switch between them. Changing the number of reels while a session is open SHALL close that session first, and SHALL reset the results area.

#### Scenario: Choosing five reels
- **WHEN** the person chooses 5 reels
- **THEN** the machine shows five reels in one row and every spin shows five symbols

#### Scenario: Changing size closes the session
- **WHEN** the person changes the number of reels while a session has at least one spin
- **THEN** that session is closed and recorded, and a new empty session starts

#### Scenario: Changing size resets the results
- **WHEN** the person changes the number of reels
- **THEN** no result of the previous session is shown and the drums are at rest

### Requirement: Themes
The system SHALL provide four built-in themes: weather, creature mood, fortune (loot) and casino. Each theme SHALL define exactly six symbols, each with an icon, a name and a relative weight, and SHALL declare one reading mode: blend, loot or payout. The person SHALL be able to choose the theme. Changing the theme while a session is open SHALL close that session first, and SHALL reset the results area.

#### Scenario: A theme has six symbols
- **WHEN** any theme is selected
- **THEN** the machine's possible symbols are that theme's six symbols and no others

#### Scenario: Changing theme closes the session
- **WHEN** the person changes the theme while a session has at least one spin
- **THEN** that session is closed and recorded, and a new empty session starts

#### Scenario: Changing theme resets the results
- **WHEN** the person changes the theme
- **THEN** no result of the previous theme is shown, the drums are at rest and the new theme starts with an empty session

#### Scenario: Weather and creature themes blend
- **WHEN** the weather or creature mood theme is selected
- **THEN** its sessions are read in blend mode

#### Scenario: Fortune is read as loot and casino as payout
- **WHEN** the fortune theme is selected
- **THEN** its sessions are read in loot mode
- **WHEN** the casino theme is selected
- **THEN** its sessions are read in payout mode

## ADDED Requirements

### Requirement: Clearing the results
The results section SHALL offer a Clear action that discards the open session's spins and any closed session's result shown there, returns the drums to rest and starts a new empty session with the same theme, reels and maximum. Clearing SHALL NOT add anything to the history and SHALL NOT change the casino balance. Clear SHALL NOT be available while a spin is in progress, nor when there is nothing to clear.

#### Scenario: Clearing an open session
- **WHEN** the person uses Clear on a session with spins
- **THEN** the results section shows no spins and no result, and the history is unchanged

#### Scenario: Clearing a closed session's result
- **WHEN** a bounded session has just closed and the person uses Clear
- **THEN** its result is no longer shown, and its history entry remains

#### Scenario: Clearing keeps the balance
- **WHEN** the person uses Clear in the casino after spinning
- **THEN** the balance is unchanged

#### Scenario: Nothing to clear
- **WHEN** the session has no spins and no closed result is shown
- **THEN** the Clear action is disabled

### Requirement: Controls grouped by purpose
The bar of choices SHALL hold only the themes and the number of reels. In the casino, the balance, the bet per spin, the balance reset and the toy-credit notice SHALL sit together in their own block, separate from that bar, shown only while the casino theme is selected. The maximum number of spins SHALL sit with the spin controls.

#### Scenario: The bar holds themes and reels only
- **WHEN** the slot machine page is shown
- **THEN** the theme bar contains the four themes and the 3 and 5 reels choices and nothing else

#### Scenario: Casino controls in their own block
- **WHEN** the casino theme is selected
- **THEN** the balance, the bets, the reset and the toy-credit notice appear together in a block of their own, outside the theme bar

#### Scenario: Other themes show no casino block
- **WHEN** the weather, creature mood or fortune theme is selected
- **THEN** no balance, bet or toy-credit notice is shown
