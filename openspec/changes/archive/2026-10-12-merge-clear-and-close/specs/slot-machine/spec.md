## ADDED Requirements

### Requirement: Clear closes the session
The current session group SHALL offer a Clear action that closes the open session: it SHALL be recorded in the history with its result, shown as the last closed session, and the drums SHALL turn back to rest and a new empty session with the same theme, reels and maximum SHALL start. Clear SHALL be the only control for closing a session by hand. Clear SHALL NOT change the casino balance, and SHALL NOT be available while a spin is in progress nor when the open session has no spins.

#### Scenario: Clearing an open session records it
- **WHEN** the person uses Clear on a session with spins
- **THEN** the session is added to the history with its result and a new empty session starts

#### Scenario: The cleared result stays readable
- **WHEN** the person uses Clear
- **THEN** the closed session's result is shown as the last closed session until the next spin or a change of theme or reels

#### Scenario: Clearing keeps the balance
- **WHEN** the person uses Clear in the casino after spinning
- **THEN** the balance is unchanged

#### Scenario: Clear returns the drums to rest
- **WHEN** the person uses Clear after a spin
- **THEN** the drums turn and land on the machine's resting symbols

#### Scenario: Nothing to clear
- **WHEN** the open session has no spins
- **THEN** the Clear action is disabled

### Requirement: The spin control fills the bar and takes the theme colour
The spin control SHALL be the largest control of the bottom bar, filling the width of that bar that the other controls leave free, and SHALL take the accent colour of the selected theme.

#### Scenario: Spin fills the bar
- **WHEN** the slot machine page is shown
- **THEN** the spin control spans the free width of the bottom bar beside the other buttons

#### Scenario: Spin takes the theme colour
- **WHEN** a different theme is selected
- **THEN** the spin control takes that theme's accent colour

## MODIFIED Requirements

### Requirement: Sessions
Every spin SHALL belong to a session. A session SHALL be free, with no limit on its spins, unless the person has set a maximum number of spins, in which case it is bounded. A free session SHALL stay open until the person clears it or until the theme or the number of reels is changed. A bounded session SHALL close by itself on its last spin and SHALL NOT accept further spins. The maximum SHALL be a whole number from 1 to 100. A session SHALL record its theme, its number of reels, its maximum (none when free), its spins in order, its result and when it closed.

#### Scenario: A free session grows
- **WHEN** the person spins five times with no maximum set
- **THEN** the open session holds five spins and is still open

#### Scenario: A bounded session closes by itself
- **WHEN** a maximum of 3 is set and the person spins three times
- **THEN** the session closes on the third spin and further spins start a new session

#### Scenario: A free session closes on request
- **WHEN** the person uses Clear on a session with spins
- **THEN** the session is closed and recorded, and a new empty session starts

#### Scenario: An empty session is not recorded
- **WHEN** a session that has no spins is closed, for instance by changing the theme
- **THEN** nothing is added to the history

### Requirement: Controls grouped by purpose
The bar of choices SHALL hold only the themes and the number of reels. In the casino, the balance, the bet per spin, the balance reset and the toy-credit notice SHALL sit together in their own block, shown only while the casino theme is selected and placed below the current session group. Where the session is a sheet instead of a side panel, that block SHALL sit with the spin control so the bet stays reachable. The maximum number of spins SHALL sit in the current session group, where it is set.

#### Scenario: The bar holds themes and reels only
- **WHEN** the slot machine page is shown
- **THEN** the theme bar contains the four themes and the 3 and 5 reels choices and nothing else

#### Scenario: Casino controls in their own block
- **WHEN** the casino theme is selected
- **THEN** the balance, the bets, the reset and the toy-credit notice appear together in a block of their own, below the current session group and outside the theme bar

#### Scenario: The maximum is set in the current session group
- **WHEN** the slot machine page is shown
- **THEN** the maximum number of spins is a field of the current session group, and not part of the theme bar or the spin controls

#### Scenario: Other themes show no casino block
- **WHEN** the weather, creature mood or fortune theme is selected
- **THEN** no balance, bet or toy-credit notice is shown

## REMOVED Requirements

### Requirement: Clearing the results
**Reason**: Clear now closes the session (see "Clear closes the session"), and the separate close session control is dropped.
**Migration**: Use "Clear closes the session": Clear records the session and shows its result as the last closed session instead of discarding it.
