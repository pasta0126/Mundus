## MODIFIED Requirements

### Requirement: Roll history
The system SHALL keep a history of the last 100 throw events (the whole
tray's "Roll", or a single die thrown on its own), each recording the date
and time it settled, every die involved with its kind, its tray label (if
any) and its value, and that event's total. The history SHALL persist in
the person's browser across page reloads, oldest entries dropped first
once the count exceeds 100. The system SHALL let the person download the
full history as a JSON file, including each entry's date and time. The
system SHALL also let the person delete the entire stored history at once,
removing every entry from both the displayed list and the persisted
storage.

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

#### Scenario: The history can be cleared
- **WHEN** the person uses the clear-history control
- **THEN** every entry is removed from the displayed history and from persisted storage, and the history remains empty after a reload
