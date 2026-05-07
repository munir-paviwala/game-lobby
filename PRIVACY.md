# Privacy & Security Model: Game Lobby

Game Lobby is built with a **Privacy-First / Serverless** architecture. Because there is no central backend, your data never touches our servers.

## 1. Zero-Backend Architecture
*   **No Accounts:** We do not collect emails, passwords (other than room codes), or personal identifiers.
*   **No Database:** All game state lives in the memory of the players' browsers and is wiped when you leave the room (or stored in your own `localStorage`).
*   **Static Hosting:** The site is served as static files from GitHub Pages. GitHub sees your IP address for the file request, but has zero visibility into your game actions or video streams.

## 2. P2P Connectivity (Trystero)
*   **Direct Connection:** We use WebRTC to establish direct connections between players.
*   **Encrypted Data:** Trystero handles encryption for all data channels. Game actions (moves, dice rolls, chat) are sent directly to other peers, not through a central relay.
*   **Signaling:** To find each other, browsers use public Nostr relays or BitTorrent DHT. These relays only help "introduce" the browsers; once the connection is made, they are out of the loop.

## 3. Media Streams (Camera & Microphone)
*   **Local Processing:** Camera and microphone streams are captured via `getUserMedia` and sent directly to other players in the room.
*   **No Recording:** Streams are never recorded, uploaded, or stored. They exist only in the temporary memory of the active call.
*   **Permission Control:** You must explicitly grant permission to your browser. You can mute or disable your camera at any time using the on-screen controls.

## 4. Room Passwords
*   **Client-Side Hashing:** When a host sets a room password, it is hashed (SHA-256) locally using the Web Crypto API.
*   **Secure Comparison:** Only the hash is shared with peers to verify the password. The actual password never leaves your browser.

## 5. Third-Party Services
*   **Nostr/BitTorrent Relays:** Used for initial peer discovery.
*   **GitHub Pages:** Hosts the static application code.
*   **No Analytics:** We do not use Google Analytics, cookies, or trackers.

---

### Things to Keep in Mind
*   **IP Addresses:** Like all P2P applications, establishing a direct WebRTC connection may expose your public IP address to the other players in the room. This is necessary for browsers to talk directly to each other without a server.
*   **Local Storage:** Your player name and recent room codes are saved in your browser's `localStorage` for your convenience. You can clear this at any time by clearing your browser cache.
