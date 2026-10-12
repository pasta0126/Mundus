## ADDED Requirements

### Requirement: Clear only closes the session
The current session group SHALL offer a Clear action that closes the open session: it SHALL be recorded in the history with its result, shown as the last closed session, and a new empty session with the same theme, reels and maximum SHALL start. Clear is a matter of the session record only and SHALL NOT move or change the machine: the drums and the symbols they show SHALL stay exactly as they are. Clear SHALL be the only control for closing a session by hand. Clear SHALL NOT change the casino balance, and SHALL NOT be available while a spin is in progress nor when the open session has no spins.

#### Scenario: Clearing an open session records it
- **WHEN** the person uses Clear on a session with spins
- **THEN** the session is added to the history with its result and a new empty session starts

#### Scenario: The cleared result stays readable
- **WHEN** the person uses Clear
- **THEN** the closed session's result is shown as the last closed session until the next spin or a change of theme or reels

#### Scenario: Clearing keeps the balance
- **WHEN** the person uses Clear in the casino after spinning
- **THEN** the balance is unchanged

#### Scenario: Clear leaves the machine alone
- **WHEN** the person uses Clear after a spin
- **THEN** the drums do not turn and keep showing the symbols of that spin

#### Scenario: Nothing to clear
- **WHEN** the open session has no spins
- **THEN** the Clear action is disabled

## REMOVED Requirements

### Requirement: Clear closes the session
**Reason**: Clear must only deal with the session record and never move the machine, so the requirement that it turns the drums back to rest is dropped.
**Migration**: Replaced by "Clear only closes the session", which keeps recording the session and showing it as the last closed one, and adds that the machine is left untouched.
