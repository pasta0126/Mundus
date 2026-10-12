## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Spin presentation
**Reason**: The ability to skip the spin animation is dropped, so the requirement is replaced by one without it.
**Migration**: Replaced by "Animated spin presentation", which keeps the 3D machine, the lever, the full-page scene, the fallback and reduced motion, and offers no skip control.
