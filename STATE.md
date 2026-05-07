# Project State: Game Lobby (P2P)

## 📜 Conversation & Progress Summary

We have successfully moved from a conceptual architecture to a fully functional P2P game platform. The project is currently at the end of **Phase 5**.

### Completed Phases:
- **Phase 1 (Foundation):** SvelteKit 5 + Trystero (Nostr) networking, global state management (Reducer/Dispatch), and static site configuration for GitHub Pages.
- **Phase 2 (Game Registry):** Pluggable architecture allowing multiple games. Wired `GAME_ACTION` to dynamic game reducers.
- **Phase 3 (Video Engine):** Integrated camera/mic streams. Built a `VideoGrid` that supports game-driven effects like "Night Phase" blurring and muting.
- **Phase 4 (Herd Mentality):** Implemented a full social quiz game with prompt picking, answer submission, and majority-based scoring.
- **Cheese Thief "Peek" Rule:** Implemented a new mechanic where a lone awake Sleepyhead can peek at another player's dice for a bonus point.
- **Audio Engine:** Added a lightweight, synthesized sound system using Web Audio API for immersive feedback (dice, reveals, phase transitions).
- **Responsive Video:** Optimized `VideoGrid` with dynamic tile sizing and refined mobile layouts for 8+ players.
- **Enhanced Summaries:** Added "Game Over" voting breakdowns and "Return to Lobby" flows for all games.
- **Privacy First:** Documented the P2P privacy model and camera/mic security in `PRIVACY.md`.
- **Shareable Rooms:** Integrated "Copy Link" functionality into the `RoomCode` component.

---

## 🏗️ Architectural Decisions

1.  **Authoritative Host:** While the network is P2P, the Host acts as the single source of truth. All actions (even local ones) are processed through the Host's reducer, and the resulting state is broadcasted to all peers.
2.  **Reactive Media Engine:** The `VideoGrid` is decoupled from game logic but reactive to it. By populating a `sleepingPeers` array in the game state, any game can instantly trigger a "blind/mute" phase for specific players.
3.  **Local-First / Serverless:** No backend is used. Connectivity is established via Nostr relays (Trystero), and data persistence is handled via `localStorage`.
4.  **Static SSL for Mobile:** Configured `vite-plugin-basic-ssl` and network exposure to allow `getUserMedia` testing on mobile devices over local IP, bypassing the browser's "Secure Context" requirement.
5.  **Synthesized Audio:** Use Web Audio API oscillators and noise buffers instead of external assets to keep the bundle small and zero-dependency.

---

## 🐞 Recent Fixes & Improvements

- **Host Identity:** Fixed a bug where actions taken by the Host were missing a `senderId`, causing them to fail in game reducers.
- **UI Decoupling:** Corrected a layout issue where the lobby "Waiting for Host" card and player list remained visible while a game was in progress.
- **Scoring Freedom:** Added manual score adjustment buttons (+/-) for the host to correct game errors or reward "house rules."
- **Lobby Exit:** Added a `BACK_TO_LOBBY` global action to allow cleanly resetting a session without leaving the room.
- **Mobile Grid:** Dynamic video tile resizing for 8+ players.

---

## 🚀 Next Implementation Steps

1.  **Deployment (Phase 6):**
    - [x] Finalize GitHub Actions push to verify the `adapter-static` build on live infra.
    - [ ] Test the "HTTPS" behavior on GitHub Pages to confirm mobile video connectivity.

2.  **UX Polish:**
    - [ ] Add more sound effects (e.g. "Game Start" fanfare).
    - [ ] Add a "How to Play" modal or overlay for each game.

3.  **Refinement:**
    - [ ] Add "Host Handover" if the original host leaves.
    - [ ] Implement Offline-first (Service Worker) for better PWA support.

