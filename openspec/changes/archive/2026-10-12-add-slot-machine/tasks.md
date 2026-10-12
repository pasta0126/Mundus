## 1. Themes and core logic

- [x] 1.1 Define the theme data shape and the four themes (weather, creature mood, fortune, casino) with six weighted symbols each, in `frontend/src/slots/`
- [x] 1.2 Implement the weighted spin using the secure RNG, one independent pick per reel
- [x] 1.3 Implement the session model: free and bounded sessions, maximum of 1 to 100, auto-close on the last spin, close on theme or reel change, empty sessions not recorded
- [x] 1.4 Implement blend reading from symbol shares (dominant, secondary above 25%, trace above 10%, random tie-break) and its text composition
- [x] 1.5 Implement loot reading (quantity per symbol, Curse as a separate penalty)
- [x] 1.6 Implement the full match bonus for blend, loot and payout modes
- [x] 1.7 Implement casino payouts (any-position matches, multiplier by symbol and match count) and tune the table to a 90-95% expected return
- [x] 1.8 Add unit tests for the readings (including the cloudy-with-sunny-spells example), the session rules and the expected return for 3 and 5 reels

## 2. Persistence

- [x] 2.1 Implement the session history in browser storage: last 100, oldest dropped, JSON export with one object per session, delete all
- [x] 2.2 Implement the casino balance in browser storage: starts at 1000, persists across reloads, reset to 1000

## 3. Page and components

- [x] 3.1 Add the `/slots` route and page shell with the Mundus title linking home, in English
- [x] 3.2 Draw the 24 symbol icons as inline SVG with a per-theme accent colour
- [x] 3.3 Build the reels row for 3 and 5 reels with spin animation, settle behaviour and skip animation
- [x] 3.4 Build the controls: theme, reel count, optional maximum spins, spin, close session
- [x] 3.5 Show the open session's spins, full match marks and live result
- [x] 3.6 Build the casino controls: balance, bet of 10, 50 or 100, disabled spin with reset when short, toy-credits notice
- [x] 3.7 Build the history list with JSON download and delete all
- [x] 3.8 Add shake-to-spin on devices with motion sensors, reusing the dice tray's permission handling
- [x] 3.9 Check the page on a narrow screen

## 3b. 3D machine

- [x] 3b.1 Move the icon drawings to markup strings so they can feed both the page and the drum textures
- [x] 3b.2 Build the 3D scene module: cabinet in the theme colour, 3 or 5 six-faced drums, visors, payline and marquee, with flat shading and the dice page's lighting
- [x] 3b.3 Draw each theme's symbol atlas (icon and name per face) as a texture
- [x] 3b.4 Animate the drums: constant spin, braking from left to right with ease-out, landing on the result's face, and a settled callback
- [x] 3b.5 Add the lever (pull animation, click or tap) and a limited orbit around the front view
- [x] 3b.6 Wire the scene into the page: spin, skip, reduced motion, theme and reel changes, flat fallback without WebGL
- [x] 3b.7 Make the 3D space fill the page with the controls overlaid and a faint win line, centring the machine in the free space
- [x] 3b.8 Check the machine on a narrow screen and in the running app

## 4. Home hub

- [x] 4.1 Change the home page to three vertical cards over two horizontal cards (dice and slots), the second row spanning the first row's width
- [x] 4.2 Add the slot machine card with its icon, name, one-line description and its own pastel colour
- [x] 4.3 Verify the cards stack on a narrow window and that the home page still loads no page code up front

## 5. About page

- [x] 5.1 Add a slot machine section to the About page listing its features and linking to `/slots`, and mention slots in the intro list

## 6. Verification

- [x] 6.1 Run the frontend type check and lint
- [x] 6.2 Walk through each scenario of the `slot-machine` and `home-hub` specs in the running app
- [ ] 6.3 Bump the version in `package.json` and tag the release per the versioning workflow
