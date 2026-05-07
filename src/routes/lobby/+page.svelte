<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { hashPassword } from '$lib/engine/crypto';
	import { playerName, isHost, hostPeerId, roomMeta, saveSession } from '$lib/engine/session';

	// ─── Tab state (create / join) ───────────────────────────────────────────
	let tab = $state<'create' | 'join'>('create');

	$effect(() => {
		if (browser && $page.url.searchParams.get('join') === 'true') {
			tab = 'join';
		}
	});

	// ─── Form state ──────────────────────────────────────────────────────────
	let nameInput = $state('');
	let roomCodeInput = $state('');
	let passwordInput = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	// ─── Room code generator ─────────────────────────────────────────────────
	function generateRoomCode(): string {
		const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
		return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(
			''
		);
	}

	let autoCode = $state(generateRoomCode());

	// ─── Validation ──────────────────────────────────────────────────────────
	function validateName(n: string): string | null {
		if (!n.trim()) return 'Please enter your name.';
		if (n.trim().length < 2) return 'Name must be at least 2 characters.';
		if (n.trim().length > 24) return 'Name must be 24 characters or less.';
		return null;
	}

	function validateRoomCode(code: string): string | null {
		if (!code.trim()) return 'Please enter a room code.';
		if (!/^[A-Z0-9]{4,10}$/i.test(code.trim())) return 'Room code must be 4–10 letters/numbers.';
		return null;
	}

	// ─── Create room ─────────────────────────────────────────────────────────
	async function handleCreate() {
		errorMsg = '';
		const nameErr = validateName(nameInput);
		if (nameErr) { errorMsg = nameErr; return; }

		loading = true;
		try {
			const roomId = autoCode.trim().toUpperCase();
			const pHash = await hashPassword(passwordInput);

			// Store session — we ARE the host
			playerName.set(nameInput.trim());
			isHost.set(true);
			// hostPeerId is set after Trystero connects in the room page
			hostPeerId.set('');
			roomMeta.set({
				roomId,
				passwordHash: pHash,
				hostId: '', // filled in by room page on connect
				gameId: null
			});
			saveSession();

			await goto(`/room/${roomId}/`);
		} catch (e) {
			errorMsg = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}

	// ─── Join room ────────────────────────────────────────────────────────────
	async function handleJoin() {
		errorMsg = '';
		const nameErr = validateName(nameInput);
		if (nameErr) { errorMsg = nameErr; return; }
		const codeErr = validateRoomCode(roomCodeInput);
		if (codeErr) { errorMsg = codeErr; return; }

		loading = true;
		try {
			const roomId = roomCodeInput.trim().toUpperCase();
			const pHash = await hashPassword(passwordInput);

			playerName.set(nameInput.trim());
			isHost.set(false);
			hostPeerId.set('');
			roomMeta.set({
				roomId,
				passwordHash: pHash,
				hostId: '', // resolved in room page after WELCOME message
				gameId: null
			});
			saveSession();

			await goto(`/room/${roomId}/`);
		} catch (e) {
			errorMsg = 'Something went wrong. Please try again.';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Game Lobby — Create or Join a Room</title>
	<meta name="description" content="Create a new game room or join an existing one with a room code." />
</svelte:head>

<main class="lobby-page">
	<div class="blob blob-1" aria-hidden="true"></div>

	<a href="/" class="back-link">← Back</a>

	<div class="lobby-card card">
		<h1 class="card-title">
			{tab === 'create' ? '🎲 Create a Room' : '🚪 Join a Room'}
		</h1>

		<!-- Tab switcher -->
		<div class="tabs" role="tablist">
			<button
				id="tab-create"
				role="tab"
				class="tab-btn"
				class:active={tab === 'create'}
				onclick={() => { tab = 'create'; errorMsg = ''; }}
				aria-selected={tab === 'create'}
			>
				Create
			</button>
			<button
				id="tab-join"
				role="tab"
				class="tab-btn"
				class:active={tab === 'join'}
				onclick={() => { tab = 'join'; errorMsg = ''; }}
				aria-selected={tab === 'join'}
			>
				Join
			</button>
		</div>

		<!-- Form -->
		<form
			class="form"
			onsubmit={(e) => { e.preventDefault(); tab === 'create' ? handleCreate() : handleJoin(); }}
		>
			<div class="field">
				<label for="player-name">Your Name</label>
				<input
					id="player-name"
					type="text"
					placeholder="e.g. Munir"
					bind:value={nameInput}
					maxlength={24}
					autocomplete="off"
					required
				/>
			</div>

			{#if tab === 'create'}
				<div class="field">
					<label for="room-code-generated">Room Code</label>
					<div class="code-row">
						<input
							id="room-code-generated"
							type="text"
							value={autoCode}
							class="code-input"
							readonly
						/>
						<button
							type="button"
							class="btn-ghost regen-btn"
							id="btn-regen-code"
							onclick={() => (autoCode = generateRoomCode())}
							title="Generate a new code"
							aria-label="Regenerate room code"
						>
							↺
						</button>
					</div>
					<p class="hint">Share this code with friends so they can join.</p>
				</div>
			{:else}
				<div class="field">
					<label for="room-code-input">Room Code</label>
					<input
						id="room-code-input"
						type="text"
						placeholder="e.g. XK7P2Q"
						bind:value={roomCodeInput}
						maxlength={10}
						autocomplete="off"
						autocapitalize="characters"
					/>
				</div>
			{/if}

			<div class="field">
				<label for="password-input">
					Password <span class="optional">(optional)</span>
				</label>
				<input
					id="password-input"
					type="password"
					placeholder={tab === 'create' ? 'Leave blank for an open room' : 'Enter the room password'}
					bind:value={passwordInput}
					autocomplete="off"
				/>
			</div>

			{#if errorMsg}
				<p class="error-msg" role="alert">{errorMsg}</p>
			{/if}

			<button
				type="submit"
				class="btn-primary submit-btn"
				id={tab === 'create' ? 'btn-create-room' : 'btn-join-room'}
				disabled={loading}
			>
				{#if loading}
					<span class="spinner" aria-hidden="true"></span>
					{tab === 'create' ? 'Creating…' : 'Joining…'}
				{:else}
					{tab === 'create' ? 'Create Room →' : 'Join Room →'}
				{/if}
			</button>
		</form>
	</div>
</main>

<style>
	.lobby-page {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1.5rem;
		position: relative;
		min-height: 100vh;
	}

	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		pointer-events: none;
		z-index: 0;
	}

	.blob-1 {
		width: 600px;
		height: 600px;
		background: radial-gradient(circle, rgba(124, 106, 247, 0.18), transparent 70%);
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}

	.back-link {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.15s ease;
		z-index: 1;
	}

	.back-link:hover {
		color: var(--color-text);
	}

	.lobby-card {
		position: relative;
		z-index: 1;
		width: 100%;
		max-width: 440px;
		padding: 2.25rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.card-title {
		font-size: 1.5rem;
		font-weight: 700;
		color: #fff;
		text-align: center;
	}

	/* Tabs */
	.tabs {
		display: flex;
		background: rgba(255, 255, 255, 0.05);
		border-radius: 10px;
		padding: 0.25rem;
		gap: 0.25rem;
	}

	.tab-btn {
		flex: 1;
		padding: 0.55rem 1rem;
		font-size: 0.9rem;
		font-weight: 600;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--color-text-muted);
		transition: background 0.18s ease, color 0.18s ease;
	}

	.tab-btn.active {
		background: rgba(124, 106, 247, 0.25);
		color: var(--color-accent-light);
	}

	.tab-btn:hover:not(.active) {
		background: rgba(255, 255, 255, 0.07);
		color: var(--color-text);
	}

	/* Form */
	.form {
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.code-row {
		display: flex;
		gap: 0.5rem;
	}

	.code-input {
		flex: 1;
		padding: 0.75rem 1rem;
		background: rgba(124, 106, 247, 0.1);
		border: 1px solid rgba(124, 106, 247, 0.3);
		border-radius: var(--radius-sm);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.14em;
		outline: none;
		user-select: all;
	}

	.regen-btn {
		padding: 0.75rem;
		font-size: 1.1rem;
		min-width: 44px;
	}

	.hint {
		font-size: 0.78rem;
		color: var(--color-text-muted);
		line-height: 1.5;
	}

	.optional {
		font-weight: 400;
		font-style: italic;
		opacity: 0.6;
	}

	.submit-btn {
		width: 100%;
		margin-top: 0.25rem;
		font-size: 1rem;
		padding: 0.875rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.spinner {
		display: inline-block;
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
