# Project State: Game Lobby (P2P)

## 📜 Conversation & Progress Summary

We have successfully moved from a conceptual architecture to a fully functional P2P game platform with a high-polish "Cozy Tabletop" UI. The project has completed **Phase 6** (UX Overhaul & Reliability).

### Completed Phases:
- **Phase 1 (Foundation):** SvelteKit 5 + Trystero (Nostr) networking, global state management (Reducer/Dispatch).
- **Phase 2 (Game Registry):** Pluggable architecture with theme support.
- **Phase 3 (Video Engine):** Integrated camera/mic streams with "headless" mode for custom layouts.
- **Phase 4 (Herd Mentality):** "Paper & Pen" aesthetic social quiz game.
- **Phase 5 (Cheese Thief):** "Tavern Table" aesthetic social deduction game.
- **Phase 6 (UX & Reliability):**
    - [x] **Tabletop Canvas:** Implemented `GameTable` with elliptical player positioning and physical sense of space.
    - [x] **Cozy Themes:** Unique color palettes and "non-corporate" styles for each game.
    - [x] **State Versioning:** Added `version` tracking to prevent out-of-order state updates.
    - [x] **Chaos Mode:** Built a Stress Testing tool for simulating bots and rapid actions.

---

## 🏗️ Architectural Decisions

1.  **Elliptical Layout:** Players are positioned around a central "Table Surface" using `Math.sin/cos`, creating a physical presence.
2.  **Headless Video Engine:** `VideoGrid` can run in a background mode to manage streams while `GameTable` handles the visual rendering via `VideoTile`.
3.  **Authoritative State with Versioning:** The Host maintains an incrementing version number for the state, ensuring clients stay in sync and can detect missed updates.
4.  **Bot Simulation:** The engine supports "Virtual Peers" (bots) for stress testing without requiring multiple physical devices.

---

## ✨ Features & Polish

- **Cozy Tabletop UI:** Radial gradients, elliptical tables, and "paper-like" UI elements.
- **Themed Games:**
    - **Cheese Thief:** Yellow pastels, tavern vibes, dice visuals.
    - **Herd Mentality:** Off-white/Pink "cow" theme, paper-slip answers.
- **Chaos Tool:** Developer tool for spawning bots and triggering rapid-fire actions to test mesh stability.
- **Manual Scoring:** Integrated into the player seat UI on the table.

---

## 🚀 Next Implementation Steps

1.  **UX Polish (Final Touches):**
    - [x] **"How to Play" Overlays:** Added cozy, handwritten-style rule cards.
    - [x] **"Join without Camera/Mic":** Pre-join checkbox so players on external calls (e.g. GMeet) can skip media devices entirely.
    - [x] **Host Video Blackout Toggle:** Host can cut all video feeds for everyone mid-game via a `SET_VIDEO_MODE` action broadcast. Affects both the pre-game VideoGrid and the in-game GameTable seats.
    - [ ] **Expansion Sound Effects:** Add "Card Deal" and "Table Thump" sounds.
    - [ ] **Win Animations:** Confetti or themed celebrations (e.g., floating cheese).

2.  **Refinement & Reliability:**
    - [ ] **State Reconciliation:** Implement logic for clients to request a full sync if `version` gaps are detected.
    - [ ] **Host Handover:** Ensure the "Table" persists if the host leaves and a new one is assigned.
    - [ ] **PWA / Offline Support:** Finalize Service Worker for flaky connections.

3.  **Future Games:**
    - [ ] **Phase 7 Idea:** "Two Truths and a Lie" using the new Tabletop slots.
