## ADDED Requirements

### Requirement: The maximum applies to the open session
Setting the maximum number of spins from the current session group SHALL apply to the open session, not only to later ones, once the person has finished entering it. Clearing the field SHALL make the session free again. If the open session has already made at least as many spins as the new maximum, it SHALL close at once and be recorded, and a new empty session with that maximum SHALL start.

#### Scenario: Bounding an open session
- **WHEN** a free session has one spin and the person sets a maximum of 3
- **THEN** the session is bounded at 3 and closes by itself after two more spins

#### Scenario: Lowering the maximum below the spins made
- **WHEN** a session has four spins and the person sets a maximum of 3
- **THEN** the session closes and is recorded, and a new empty session with a maximum of 3 starts

#### Scenario: Clearing the field frees the session
- **WHEN** a bounded session is open and the person empties the maximum field
- **THEN** the session has no limit

## MODIFIED Requirements

### Requirement: Clearing the results
The results section SHALL offer a Clear action that discards the open session's spins and any closed session's result shown there, turns the drums back to rest and starts a new empty session with the same theme, reels and maximum. Clearing SHALL NOT add anything to the history and SHALL NOT change the casino balance. Clear SHALL NOT be available while a spin is in progress, nor when there is nothing to clear.

#### Scenario: Clearing an open session
- **WHEN** the person uses Clear on a session with spins
- **THEN** the results section shows no spins and no result, and the history is unchanged

#### Scenario: Clearing a closed session's result
- **WHEN** a bounded session has just closed and the person uses Clear
- **THEN** its result is no longer shown, and its history entry remains

#### Scenario: Clearing keeps the balance
- **WHEN** the person uses Clear in the casino after spinning
- **THEN** the balance is unchanged

#### Scenario: The drums return to rest
- **WHEN** the person uses Clear after a spin
- **THEN** the drums turn and land on the machine's resting symbols

#### Scenario: Nothing to clear
- **WHEN** the session has no spins and no closed result is shown
- **THEN** the Clear action is disabled

### Requirement: Controls grouped by purpose
The bar of choices SHALL hold only the themes and the number of reels. In the casino, the balance, the bet per spin, the balance reset and the toy-credit notice SHALL sit together in their own block, separate from that bar, shown only while the casino theme is selected. The maximum number of spins SHALL sit in the current session group, where it is set.

#### Scenario: The bar holds themes and reels only
- **WHEN** the slot machine page is shown
- **THEN** the theme bar contains the four themes and the 3 and 5 reels choices and nothing else

#### Scenario: Casino controls in their own block
- **WHEN** the casino theme is selected
- **THEN** the balance, the bets, the reset and the toy-credit notice appear together in a block of their own, outside the theme bar

#### Scenario: The maximum is set in the current session group
- **WHEN** the slot machine page is shown
- **THEN** the maximum number of spins is a field of the current session group, and not part of the theme bar or the spin controls

#### Scenario: Other themes show no casino block
- **WHEN** the weather, creature mood or fortune theme is selected
- **THEN** no balance, bet or toy-credit notice is shown
