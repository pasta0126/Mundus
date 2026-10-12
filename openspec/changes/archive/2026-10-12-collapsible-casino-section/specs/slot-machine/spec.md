## MODIFIED Requirements

### Requirement: Controls grouped by purpose
The bar of choices SHALL hold only the themes and the number of reels. In the casino, the balance, the bet per spin, the balance reset and the toy-credit notice SHALL sit together in one collapsible section of the current session group, placed right below the maximum number of spins, shown only while the casino theme is selected and collapsed by default. While collapsed, its header SHALL still show the balance as toy credits and the bet, and SHALL say so when the balance can't cover the bet. The maximum number of spins SHALL sit in the current session group, where it is set.

#### Scenario: The bar holds themes and reels only
- **WHEN** the slot machine page is shown
- **THEN** the theme bar contains the four themes and the 3 and 5 reels choices and nothing else

#### Scenario: Casino controls in their own block
- **WHEN** the casino theme is selected
- **THEN** the balance, the bets, the reset and the toy-credit notice are together in one section of the current session group, below the maximum number of spins and outside the theme bar

#### Scenario: The casino section starts collapsed
- **WHEN** the casino theme is selected
- **THEN** the casino section is collapsed, showing only its header with the balance and the bet

#### Scenario: Expanding the casino section
- **WHEN** the person expands the casino section
- **THEN** the bets, the balance reset and the toy-credit notice are shown, and collapsing hides them again

#### Scenario: A short balance is visible when collapsed
- **WHEN** the balance is lower than the bet and the casino section is collapsed
- **THEN** its header says there are not enough credits for the bet

#### Scenario: The maximum is set in the current session group
- **WHEN** the slot machine page is shown
- **THEN** the maximum number of spins is a field of the current session group, and not part of the theme bar or the spin controls

#### Scenario: Other themes show no casino block
- **WHEN** the weather, creature mood or fortune theme is selected
- **THEN** no balance, bet or toy-credit notice is shown
