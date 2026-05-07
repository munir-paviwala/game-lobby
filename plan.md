# 🎲 game-lobby — Architecture & Planning
> A local-first, peer-to-peer web board game platform hosted as a static site on GitHub Pages.
> **For players:** just open a link in any browser. No installs, no accounts, no downloads.
---
## ✅ Proposed Tech Stack — Recommendations & Changes
The original spec is solid in spirit. Below are my recommendations, including a few important swaps.
> [!NOTE]
> **On "easy for non-coders to host":** There are two kinds of "hosting" here.
> - **Deploying the web app** (one-time, done by you) → GitHub Pages handles this. Push to `main`, GitHub builds and serves it automatically. Players never touch this.
> - **Hosting a game room** (in-game host role) → The first person to create a room becomes the "Host." They just open the URL, type their name + a room code, and share that code with friends. Zero installs for anyone.
### 1. Framework: Svelte via **SvelteKit** (not plain Vite)
| | Plain Svelte + Vite | SvelteKit (static adapter) |
|---|---|---|
| File-based routing | ❌ manual | ✅ built-in |
| GitHub Pages deploy | Works | Works (with `adapter-static`) |
| Code splitting per game | Manual dynamic imports | ✅ automatic per route |
| SSR risk on GH Pages | N/A | Set `prerender = true`, no risk |
**Recommendation: Use SvelteKit with `@sveltejs/adapter-static`.** It gives you clean `/lobby`, `/game/herd-mentality`, `/game/cheese-thief` URL structure for free, handles code splitting automatically (so the Cheese Thief bundle doesn't load for Herd Mentality players), and is trivially deployable to GitHub Pages via `gh-pages` branch.
---
### 2. Networking: **Trystero** instead of PeerJS
> [!IMPORTANT]
> This is the most critical recommendation.
PeerJS depends on a **hosted signaling server** (`peerjs.com`). This breaks the "no backend" requirement silently — if that server goes down or rate-limits you, everyone's connections fail. It also means you're trusting a third party.
**[Trystero](https://github.com/dmotz/trystero)** is a serverless P2P library that uses **BitTorrent DHT, Nostr, or MQTT public brokers** for signaling — truly no central server.
| | PeerJS | Trystero |
|---|---|---|
| Signaling server | `peerjs.com` (3rd party) | Decentralized (DHT/Nostr/MQTT) |
| WebRTC data channels | ✅ | ✅ |
| Media streams | ✅ | ✅ |
| Bundle size | ~80KB | ~25KB |
| Self-hosted option | Needs server | Not needed |
| Truly serverless | ❌ | ✅ |
If you prefer to keep PeerJS, **self-host the signaling server on Railway/Render's free tier** — but that adds a service to maintain.
---
### 3. Video: **Native WebRTC via Trystero** instead of Jitsi
> [!WARNING]
> The Jitsi Meet IFrame API has a critical limitation: **programmatic muting/blurring of specific _remote_ participants is not reliably possible** from the host page. Jitsi's API only controls your _own_ local stream. Blurring the iframe itself is a CSS hack that hides _all_ participants, not selective ones.
For Cheese Thief's night-phase mechanic (selectively muting/hiding individual players), you need **real per-track control**.
**Options ranked:**
| Option | Per-user blur/mute control | Free tier | Complexity |
|---|---|---|---|
| **Trystero native streams** | ✅ full control | ✅ free | Medium |
| **Daily.co** (Prebuilt UI or Callframe) | ✅ via `updateParticipant()` | ✅ 10k mins/month | Low |
| **Livekit** (open source, self-hosted) | ✅ full control | ✅ free self-host | High (needs server) |
| **Jitsi IFrame** | ❌ local only | ✅ free | Medium |
**✅ Decision: Trystero native streams.** Full per-track control, zero external dependencies, free forever. For 4–8 players the mesh is rock-solid. We get the exact per-player blur/mute we need for Cheese Thief's night phase without any third-party calls.
---
### 4. State Sync: Host-as-Authority + Reducer Pattern
Start simple: host is the single source of truth. Structure your state as plain JSON objects mutated only via `dispatchAction(type, payload)`. This is essentially a mini-Redux pattern and maps cleanly to Svelte stores.
This means:
- State lives in a single `gameState` object (a Svelte writable store)
- All mutations go through `dispatchAction()` — never direct state mutation
- Host applies the reducer and re-broadcasts the new state to all peers
This architecture can later be upgraded to CRDTs (Yjs/Automerge) if needed.
---
### 5. Hosting: GitHub Pages ✅ (no change needed)
SvelteKit + `adapter-static` + a `gh-pages` GitHub Action is the smoothest path. One caveat: **GitHub Pages doesn't support URL rewriting for SPAs**. Use SvelteKit's `trailingSlash: 'always'` option and a custom `404.html` redirect for deep links.
---
## 📁 Recommended Folder Structure
```
game-lobby/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte          # Shell: nav, theme
│   │   ├── +page.svelte            # Landing / Home
│   │   ├── lobby/
│   │   │   └── +page.svelte        # Create / Join room
│   │   └── room/
│   │       └── [roomId]/
│   │           └── +page.svelte    # Active game room
│   │
│   ├── lib/
│   │   ├── engine/
│   │   │   ├── peer.js             # Trystero connection manager
│   │   │   ├── stateStore.js       # Writable Svelte store + reducer bus
│   │   │   ├── VideoGrid.svelte    # <video> grid per peer stream
│   │   │   └── types.ts            # Shared action/state types
│   │   │
│   │   ├── games/
│   │   │   ├── registry.js         # { id, name, component } manifest
│   │   │   ├── herd-mentality/
│   │   │   │   ├── index.svelte    # UI component
│   │   │   │   ├── reducer.js      # Pure state reducer
│   │   │   │   └── prompts.json    # Sample prompts
│   │   │   └── cheese-thief/
│   │   │       ├── index.svelte
│   │   │       └── reducer.js
│   │   │
│   │   └── components/
│   │       ├── PlayerCard.svelte
│   │       ├── RoomCode.svelte
│   │       └── ScoreBoard.svelte
│   │
│   └── app.html                    # HTML shell
│
├── static/                         # Assets
├── svelte.config.js                # adapter-static config
├── vite.config.js
└── .github/
    └── workflows/
        └── deploy.yml              # GH Pages auto-deploy
```
---
## 🗺️ Phased Implementation Plan
### Phase 0 — Repo & CI Setup *(~1 hour)*
- [x] Rename repo to `game-lobby`
- [ ] `npx sv create ./ --template minimal --types ts` (SvelteKit + TS)
- [ ] Install Trystero: `npm install trystero`
- [ ] Install `@sveltejs/adapter-static`
- [ ] Set up `deploy.yml` GitHub Action for Pages
### Phase 1 — Lobby & Room Creation *(~1 day)*
- [ ] Landing page with "Create Room" / "Join Room" flow
- [ ] Trystero `joinRoom(appId, roomId)` hooked to a Svelte store
- [ ] Detect Host vs Client role (first to create = Host)
- [ ] Player name entry → broadcast presence to room
- [ ] Player list UI that live-updates as peers join/leave
### Phase 2 — Core Engine *(~1-2 days)*
- [ ] `stateStore.js`: writable store + `dispatchAction()` + Host reducer loop
- [ ] Action broadcasting: Host re-broadcasts new state after each action
- [ ] Reconnection handling (peer drops and rejoins)
- [ ] Game registry: Host picks game from dropdown, broadcasts `START_GAME`
### Phase 3 — Video Grid *(~1 day)*
- [ ] Trystero media stream sharing (camera/mic via `addStream`)
- [ ] `VideoGrid.svelte`: renders a `<video>` per peer, plus local preview
- [ ] Night-phase blur: CSS class toggle per `playerId` based on game state
- [ ] Mute control: `track.enabled = false` for local stream when sleeping
### Phase 4 — Herd Mentality *(~1 day)*
- [ ] Host picks prompt → broadcasts to clients
- [ ] Players type answer → send privately to host via direct peer message
- [ ] Host clicks Reveal → reducer finds majority answer → awards points
- [ ] Score board updated and rebroadcast
### Phase 5 — Cheese Thief *(~1-2 days)*
- [ ] Role assignment reducer: random Thief + Wake Hours
- [ ] Night phase loop: host advances hour → reducer computes who's awake
- [ ] Engine applies blur/mute to VideoGrid per player's sleep state
- [ ] Day phase: discussion mode, all awake, vote to accuse
### Phase 6 — Polish *(ongoing)*
- [ ] Mobile-responsive layout (game area stacked above video on small screens)
- [ ] Sound effects (Web Audio API — no external deps)
- [ ] Shareable room link (roomId in URL query param)
- [ ] Offline-first: service worker for static assets
---
## ⚠️ Key Risks & Mitigations
| Risk | Likelihood | Mitigation |
|---|---|---|
| WebRTC NAT traversal fails (corporate/university networks) | Medium | Trystero tries multiple signaling strategies; add TURN server config as opt-in |
| Host disconnect kills game | High | Elect new host on disconnect (pick lowest peer ID alphabetically) |
| GitHub Pages 404 on direct URL access | High | Use `404.html` redirect trick or hash-based routing |
| Player count — WebRTC mesh doesn't scale past ~8 peers | Low for board games | Mesh is fine for 4–8 players; document this limit |
| Camera/mic permission UX is confusing | Medium | Show clear permission prompt with instructions before joining |
---
## 🔑 Finalized Decisions
| Decision | Choice | Notes |
|---|---|---|
| Framework | SvelteKit + `adapter-static` | File routing, auto code-splitting, GH Pages deploy |
| Networking | Trystero (DHT/Nostr) | Truly serverless, no `peerjs.com` dependency |
| Video | Trystero native streams | Zero deps, full per-track control for night phase |
| Language | TypeScript | Required for engine layer; JSDoc for simple components is fine |
| State persistence | `localStorage` snapshot at host | Host state survives refresh; clients rejoin cleanly |
| Identity | Player name + **room password** | No accounts needed; host sets a password when creating room, joiners must enter it |
---
## 🔐 Room Password Flow
Purely client-side — no server involved:
1. **Host creates room:** enters name + room code + optional password → stored in local state
2. **Password is hashed** (SHA-256 via Web Crypto API) and broadcast as part of room metadata
3. **Client joins:** enters name + room code + password → hash is compared locally before the P2P connection is established
4. **Wrong password:** connection is refused with a friendly error — no server roundtrip needed
This is security-by-obscurity (anyone who intercepts the hash could brute-force it), but it's more than enough to prevent randos from stumbling into a private game room.
---
## 🚀 Ready to Start
All decisions locked. Next step: **Phase 0 — scaffold the SvelteKit project.**
```bash
cd /Users/munirmahedipaviwala/github/game-lobby
npx sv create ./ --template minimal --types ts
npm install trystero
npm install -D @sveltejs/adapter-static
```
---
*Last updated: 2026-05-07 — all decisions finalized*