# slot-machine Specification

## Purpose
Let a person spin a single row of themed reels, gather the spins into a session, and read the whole session together as a weather, a mood, a loot haul or a casino result, so the slot machine serves both as a tabletop role-playing oracle and as a small game of chance.

## Requirements

### Requirement: A slot machine page
The system SHALL serve a slot machine page at `/slots`. It SHALL show a single row of reels, a control to spin, a control to choose the theme, a control to choose the number of reels, and the current session's spins and result. Every piece of user-facing text on the page SHALL be in English.

#### Scenario: The page opens without spinning
- **WHEN** a person opens `/slots`
- **THEN** the reels are shown at rest, no spin has been made and no result is shown

#### Scenario: The page is in English
- **WHEN** the slot machine page is shown
- **THEN** all its labels, descriptions and buttons are in English

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

### Requirement: Weather theme symbols
The weather theme SHALL have the symbols Sun, Cloud, Rain, Wind, Snow and Storm. Sun and Cloud SHALL be the most likely, Rain and Wind less likely, and Snow and Storm the least likely.

#### Scenario: Weather symbols
- **WHEN** the weather theme is selected
- **THEN** the six symbols are Sun, Cloud, Rain, Wind, Snow and Storm

### Requirement: Creature mood theme symbols
The creature mood theme SHALL have the symbols Calm, Curious, Wary, Hungry, Frightened and Furious. Calm SHALL be the most likely, Curious, Wary and Hungry less likely, and Frightened and Furious the least likely.

#### Scenario: Creature mood symbols
- **WHEN** the creature mood theme is selected
- **THEN** the six symbols are Calm, Curious, Wary, Hungry, Frightened and Furious

### Requirement: Fortune theme symbols
The fortune theme SHALL have the symbols Gold, Gem, Potion, Scroll, Relic and Curse. Gold SHALL be the most likely, Gem and Potion less likely, Scroll and Curse rarer, and Relic the rarest. Curse SHALL be a penalty rather than a reward.

#### Scenario: Fortune symbols
- **WHEN** the fortune theme is selected
- **THEN** the six symbols are Gold, Gem, Potion, Scroll, Relic and Curse

### Requirement: Casino theme symbols
The casino theme SHALL have the symbols Cherry, Lemon, Bell, Bar, Seven and Diamond. Cherry and Lemon SHALL be the most likely and the lowest in value, Bell and Bar less likely and of middle value, Seven rarer and of high value, and Diamond the rarest and the jackpot.

#### Scenario: Casino symbols
- **WHEN** the casino theme is selected
- **THEN** the six symbols are Cherry, Lemon, Bell, Bar, Seven and Diamond

### Requirement: A spin is random and weighted
A spin SHALL give every reel a symbol of the selected theme, chosen independently at random with each symbol's probability proportional to its weight. A spin's outcome SHALL NOT come from a seed or a stored value, so spins are not reproducible.

#### Scenario: Every reel gets a symbol
- **WHEN** the person spins a 3-reel machine
- **THEN** three symbols of the selected theme are shown, one per reel

#### Scenario: Heavier symbols come up more often
- **WHEN** a very large number of spins is made with the weather theme
- **THEN** Sun and Cloud appear clearly more often than Storm

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

### Requirement: Reading a session in blend mode
In blend mode the system SHALL count every symbol across all the spins of the session and express each as a share of all the symbols shown. The symbol with the largest share SHALL be the dominant symbol, with ties broken at random. Every other symbol with a share above 25% SHALL be a secondary symbol, and every other symbol with a share above 10% and up to 25% SHALL be a trace symbol. The result SHALL be shown as a text built from the dominant, secondary and trace symbols and a full match bonus, and SHALL be recomputed after every spin of an open session.

#### Scenario: Cloudy with sunny spells
- **WHEN** three spins of three reels show Cloud, Sun, Sun; Sun, Rain, Cloud; and Cloud, Cloud, Cloud under the weather theme
- **THEN** Cloud is dominant with 5 of 9, Sun is secondary with 3 of 9, Rain is a trace with 1 of 9, and the result reads as a cloudy sky with sunny spells and a little rain

#### Scenario: Shares do not depend on the number of reels
- **WHEN** the same symbols appear in the same proportions on a 3-reel and on a 5-reel session
- **THEN** the dominant, secondary and trace symbols are the same

### Requirement: Reading a session in loot mode
In loot mode the system SHALL count the appearances of each symbol across all the spins of the session and show each count as a quantity of that symbol. A Curse SHALL be shown as a penalty and SHALL NOT be subtracted from another symbol's quantity. The result SHALL be recomputed after every spin of an open session.

#### Scenario: A loot haul
- **WHEN** the fortune theme's session shows Gold six times, Gem twice, Potion once and Curse once
- **THEN** the result lists 6 Gold, 2 Gems, 1 Potion and a penalty of 1 Curse

### Requirement: Full match bonus
A spin in which every reel shows the same symbol SHALL be a full match. In blend mode a full match SHALL intensify the matched symbol's wording in the result. In loot mode a full match SHALL multiply that symbol's quantity from that spin by 2. In payout mode a full match SHALL pay the highest multiplier of that symbol. A full match SHALL be visibly marked on its spin.

#### Scenario: A full match intensifies the dominant
- **WHEN** a spin shows Storm on every reel in the weather theme
- **THEN** the spin is marked as a full match and the result describes the storm as intensified

#### Scenario: A full match doubles loot
- **WHEN** a spin of three reels shows Gem on every reel in the fortune theme
- **THEN** that spin contributes 6 Gems to the loot instead of 3

### Requirement: Casino balance and bets
The casino theme SHALL keep a balance of toy credits, starting at 1000, and SHALL let the person choose a bet per spin of 10, 50 or 100. Every spin SHALL deduct its bet and add its payout to the balance at once. A spin SHALL NOT be allowed when the balance is lower than the bet. The balance SHALL persist in the person's browser across page reloads, and the person SHALL be able to reset it to 1000. The casino SHALL state on the page that the credits are toys with no real-money value, and SHALL NOT take, show or require real money.

#### Scenario: A spin costs the bet
- **WHEN** the balance is 1000, the bet is 50 and the spin pays nothing
- **THEN** the balance becomes 950

#### Scenario: Not enough balance
- **WHEN** the balance is 20 and the bet is 50
- **THEN** the spin control is disabled and a way to reset the balance is offered

#### Scenario: The balance persists
- **WHEN** the balance is 700 and the page is reloaded
- **THEN** the casino balance is still 700

#### Scenario: The toy credits are stated
- **WHEN** the casino theme is selected
- **THEN** the page states that the credits are toys with no real-money value

### Requirement: Casino payouts
In payout mode a spin SHALL pay when at least two reels, in any position, show the same symbol. The payout SHALL be the bet multiplied by a multiplier that depends on the symbol and on how many reels match, and SHALL grow with both the symbol's value and the number of matching reels. Spins with no two matching reels SHALL pay nothing. The payout table SHALL be tuned so the expected return over many spins is between 90% and 95% of the bets.

#### Scenario: Two matching reels pay a little
- **WHEN** a 3-reel spin shows Cherry, Cherry, Bell and the bet is 10
- **THEN** the spin pays the Cherry two-match multiplier times 10

#### Scenario: Position does not matter
- **WHEN** a 3-reel spin shows Seven, Bell, Seven
- **THEN** it pays the same as Seven, Seven, Bell

#### Scenario: No match pays nothing
- **WHEN** a 3-reel spin shows three different symbols
- **THEN** the spin pays nothing

### Requirement: Shaking a device spins
On a device that exposes motion sensors, physically shaking it SHALL spin the machine once, the same as using the spin control.

#### Scenario: A shake spins
- **WHEN** a person shakes a device with motion sensors while on the slot machine page
- **THEN** the machine spins once

### Requirement: Session history
The system SHALL keep a history of the last 100 closed sessions. Each entry SHALL record the session's theme, number of reels, maximum, spins, result and the date and time it closed. The history SHALL persist in the person's browser across page reloads, with the oldest entries dropped first when the count exceeds 100. The person SHALL be able to download the full history as a JSON file in which each session is one object, and SHALL be able to delete the entire stored history at once.

#### Scenario: A closed session is recorded
- **WHEN** a session with spins is closed
- **THEN** it appears in the history with its date and time

#### Scenario: The history is capped
- **WHEN** a 101st session is closed
- **THEN** the history holds the most recent 100 sessions and the oldest one is dropped

#### Scenario: Exporting
- **WHEN** the person downloads the history
- **THEN** a JSON file is saved in which each session is one object with its theme, reels, maximum (null when free), spins, result and closing time

#### Scenario: Deleting the history
- **WHEN** the person deletes the history
- **THEN** no entry remains in the displayed list or in the browser's storage

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

### Requirement: Animated spin presentation
The reels SHALL be shown as a three-dimensional, low-poly machine in the style of the dice tray and planet pages: each reel a drum with one flat face per symbol of the selected theme, set in a cabinet that takes the theme's accent colour, with a lever at its side. The three-dimensional space SHALL fill the whole page, with the controls, the session and the history laid over it as on the dice page, the machine kept centred in the space the controls leave free. The win line, where the result sits, SHALL be only a faint, translucent guide that does not compete with the symbols. A spin SHALL turn every drum, stop them one after another from left to right, and land each on its symbol, and SHALL show its result only when every drum has settled. The person SHALL be able to spin by using the lever as well as the spin control. Each symbol SHALL be drawn on its face as a clear icon with its name, legible from the front. The camera MAY be turned a little but the front of the drums SHALL stay in view. When the device cannot draw three-dimensional graphics, the machine SHALL fall back to a flat row of reels with the same behaviour. A person who prefers reduced motion SHALL see each spin land at once without the turning.

#### Scenario: The controls float over the scene
- **WHEN** the slot machine page is shown
- **THEN** the 3D space fills the page and the controls are laid over it, with the machine fully visible and not covered by them

#### Scenario: The result waits for the drums
- **WHEN** a spin is made
- **THEN** the spin and the session result update only after every drum has settled

#### Scenario: Drums stop from left to right
- **WHEN** a spin is made on a 5-reel machine
- **THEN** the first drum settles first, and each following drum settles after the previous one

#### Scenario: Each drum lands on its symbol
- **WHEN** a spin settles
- **THEN** each drum shows, facing the front, the symbol of that reel's result

#### Scenario: The lever spins
- **WHEN** the person uses the lever
- **THEN** the lever is pulled and the machine spins once, as with the spin control

#### Scenario: No skip control
- **WHEN** a spin is in progress
- **THEN** no control to skip the animation is offered

#### Scenario: A flat fallback without 3D graphics
- **WHEN** the device cannot draw three-dimensional graphics
- **THEN** the reels are shown as a flat row that spins and settles in the same way

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion
- **THEN** a spin shows its final symbols at once without the drums turning

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
