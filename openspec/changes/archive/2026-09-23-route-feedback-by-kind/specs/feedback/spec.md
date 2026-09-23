## MODIFIED Requirements

### Requirement: Feedback is relayed, not stored
Submitting the feedback form SHALL NOT persist the submission in any
database. A comment SHALL be relayed to a Discord channel via a webhook
only. A bug report or feature request SHALL create a GitHub Issue in the
project's repository only, labeled by the chosen kind.

#### Scenario: A submission reaches Discord
- **WHEN** a person submits a comment (not a bug or feature)
- **THEN** a message containing the message and name (if given) is posted to the configured Discord webhook and no GitHub Issue is created

#### Scenario: A submission creates a GitHub Issue
- **WHEN** a person submits a bug report or a feature request
- **THEN** a new Issue is created in the project's GitHub repository, titled and labeled according to its kind, with the message as its body, and nothing is posted to Discord

#### Scenario: Nothing is stored server-side
- **WHEN** any number of feedback submissions have been sent
- **THEN** no database record of any submission exists on the server

## ADDED Requirements

### Requirement: Direct links to Discord and the repository
The feedback section SHALL offer a button that opens the project's Discord
invite and a button that opens the project's GitHub repository, each in a
new tab.

#### Scenario: The Discord button opens the invite
- **WHEN** a person uses the Discord button
- **THEN** the Discord invite opens in a new tab

#### Scenario: The repository button opens GitHub
- **WHEN** a person uses the repository button
- **THEN** the project's GitHub repository opens in a new tab
