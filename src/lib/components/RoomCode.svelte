<script lang="ts">
	interface Props {
		roomId: string;
	}

	let { roomId }: Props = $props();

	let copied = $state(false);

	async function copy() {
		const url = new URL(window.location.href);
		url.pathname = `/room/${roomId}/`;
		url.search = '';
		await navigator.clipboard.writeText(url.toString());
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="room-code-card">
	<div class="label">Room Code</div>
	<div class="code">{roomId}</div>
	<button class="copy-btn" onclick={copy}>
		{#if copied}
			<span>✓ Copied!</span>
		{:else}
			<span>Copy Link</span>
		{/if}
	</button>
</div>

<style>
	.room-code-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.15);
		border-radius: 12px;
	}

	.label {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: rgba(255, 255, 255, 0.4);
		white-space: nowrap;
	}

	.code {
		font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #fff;
		flex: 1;
	}

	.copy-btn {
		padding: 0.35rem 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 8px;
		color: #fff;
		font-size: 0.8rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
		transition: background 0.15s ease;
	}

	.copy-btn:hover {
		background: rgba(255, 255, 255, 0.18);
	}
</style>
