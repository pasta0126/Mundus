# feedback Specification

## Purpose
Lets a visitor send a comment, bug report or feature request straight to the
owner, without any server-side storage of submissions.

## Requirements

### Requirement: Feedback form
The About page SHALL show a feedback form letting a visitor choose a kind
(comment, bug or feature request), enter a message, and optionally give a
name, then submit it.

#### Scenario: A visitor submits feedback
- **WHEN** a person fills in the feedback form's message and submits it
- **THEN** the submission is sent and the form shows a confirmation

#### Scenario: An empty message cannot be submitted
- **WHEN** a person submits the feedback form with an empty message
- **THEN** the submission is rejected and no notification is sent

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

### Requirement: Recognisable platform buttons
The Discord and repository links SHALL look like their platforms' own
buttons - Discord's blurple with its logo, and GitHub's dark colour with its
logo - and SHALL be centered in the feedback section.

#### Scenario: The buttons look like their platforms'
- **WHEN** the feedback section is shown
- **THEN** the Discord link is blurple with the Discord logo and the repository link is dark with the GitHub logo, centered

### Requirement: English text
Every piece of user-facing text in the feedback form SHALL be in English.

#### Scenario: All text is English
- **WHEN** the feedback form is shown
- **THEN** all its labels, options and messages are in English
