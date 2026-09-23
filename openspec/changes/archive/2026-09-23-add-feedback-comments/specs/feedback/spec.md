## Purpose
Lets a visitor send a comment, bug report or feature request straight to the
owner, without any server-side storage of submissions.

## ADDED Requirements

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
database. Each submission SHALL be relayed immediately to a Discord channel
via a webhook and SHALL create a GitHub Issue in the project's repository,
labeled by the chosen kind.

#### Scenario: A submission reaches Discord
- **WHEN** a person submits the feedback form
- **THEN** a message containing the kind, message and name (if given) is posted to the configured Discord webhook

#### Scenario: A submission creates a GitHub Issue
- **WHEN** a person submits the feedback form
- **THEN** a new Issue is created in the project's GitHub repository, titled and labeled according to the submission's kind, with the message as its body

#### Scenario: Nothing is stored server-side
- **WHEN** any number of feedback submissions have been sent
- **THEN** no database record of any submission exists on the server

### Requirement: English text
Every piece of user-facing text in the feedback form SHALL be in English.

#### Scenario: All text is English
- **WHEN** the feedback form is shown
- **THEN** all its labels, options and messages are in English
