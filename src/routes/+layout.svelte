<script lang="ts">
	import { page } from '$app/stores';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="app-shell">
	{@render children()}
</div>

<style>
	/* ─── Design Tokens ───────────────────────────────────────────────────── */
	:global(:root) {
		--bg-base: #0d0d14;
		--bg-surface: #13131f;
		--bg-card: #1a1a2a;

		--color-text: #e8e8f0;
		--color-text-muted: rgba(232, 232, 240, 0.5);

		--color-accent: #7c6af7;
		--color-accent-light: #9d8ffb;
		--color-accent-glow: rgba(124, 106, 247, 0.35);

		--color-gold: #f0b429;
		--color-success: #2dd4a1;
		--color-danger: #f06060;

		--radius-sm: 8px;
		--radius-md: 14px;
		--radius-lg: 20px;
		--radius-xl: 28px;

		--shadow-glow: 0 0 30px rgba(124, 106, 247, 0.2);
		--shadow-card: 0 8px 32px rgba(0, 0, 0, 0.4);

		--font-sans: 'Inter', system-ui, sans-serif;
		--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

		--transition-fast: 150ms ease;
		--transition-md: 250ms ease;
		--transition-slow: 400ms cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* ─── Global Reset ────────────────────────────────────────────────────── */
	:global(*, *::before, *::after) {
		box-sizing: border-box;
		margin: 0;
		padding: 0;
	}

	:global(html, body) {
		height: 100%;
		font-family: var(--font-sans);
		background: var(--bg-base);
		color: var(--color-text);
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(button) {
		font-family: var(--font-sans);
		cursor: pointer;
	}

	:global(input, select, textarea) {
		font-family: var(--font-sans);
	}

	/* ─── Global Utility Classes ──────────────────────────────────────────── */

	/* Primary filled button */
	:global(.btn-primary) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: opacity var(--transition-fast), transform var(--transition-fast),
			box-shadow var(--transition-fast);
		box-shadow: 0 4px 16px var(--color-accent-glow);
		white-space: nowrap;
	}

	:global(.btn-primary:hover:not(:disabled)) {
		opacity: 0.92;
		transform: translateY(-1px);
		box-shadow: 0 6px 24px var(--color-accent-glow);
	}

	:global(.btn-primary:active:not(:disabled)) {
		transform: translateY(0);
	}

	:global(.btn-primary:disabled) {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Ghost outlined button */
	:global(.btn-ghost) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: transparent;
		color: var(--color-text);
		font-size: 0.95rem;
		font-weight: 500;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background var(--transition-fast), border-color var(--transition-fast),
			transform var(--transition-fast);
		white-space: nowrap;
	}

	:global(.btn-ghost:hover:not(:disabled)) {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}

	:global(.btn-ghost:disabled) {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Danger/destructive button */
	:global(.btn-danger) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: rgba(240, 96, 96, 0.15);
		color: var(--color-danger);
		font-size: 0.95rem;
		font-weight: 600;
		border: 1px solid rgba(240, 96, 96, 0.3);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: background var(--transition-fast);
		white-space: nowrap;
	}

	:global(.btn-danger:hover) {
		background: rgba(240, 96, 96, 0.25);
	}

	/* Glass utility */
	:global(.glass) {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	/* Animations */
	:global(.animate-in) {
		animation: fade-in-up 0.5s var(--transition-slow) forwards;
	}

	@keyframes fade-in-up {
		from { opacity: 0; transform: translateY(10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	/* Form inputs */
	:global(.field) {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	:global(.field label) {
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}

	:global(.field input) {
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--radius-sm);
		color: var(--color-text);
		font-size: 1rem;
		outline: none;
		transition: border-color var(--transition-fast), background var(--transition-fast);
	}

	:global(.field input:focus) {
		border-color: var(--color-accent);
		background: rgba(124, 106, 247, 0.08);
	}

	:global(.field input::placeholder) {
		color: rgba(255, 255, 255, 0.25);
	}

	/* Card surface */
	:global(.card) {
		background: var(--bg-card);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-card);
	}

	/* Error message */
	:global(.error-msg) {
		font-size: 0.85rem;
		color: var(--color-danger);
		padding: 0.5rem 0.75rem;
		background: rgba(240, 96, 96, 0.1);
		border-radius: var(--radius-sm);
		border: 1px solid rgba(240, 96, 96, 0.2);
	}

	/* ─── App Shell ───────────────────────────────────────────────────────── */
	.app-shell {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}
</style>
