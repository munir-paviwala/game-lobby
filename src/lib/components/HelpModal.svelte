<script lang="ts">
	import { fade, scale } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
	}

	let { isOpen, onClose }: Props = $props();
</script>

{#if isOpen}
	<div class="modal-backdrop" onclick={onClose} transition:fade>
		<div class="modal-content card glass animate-in" onclick={(e) => e.stopPropagation()} transition:scale={{start: 0.95, duration: 200}}>
			<header class="modal-header">
				<h2>How to Play</h2>
				<button class="close-btn" onclick={onClose}>×</button>
			</header>

			<div class="modal-body">
				<section class="game-help">
					<h3>🐄 Herd Mentality</h3>
					<p>Think like the herd! Everyone answers a prompt. If your answer matches the majority, you get a point. If you're the only one with a different answer (or in the minority), you get nothing!</p>
					<ul>
						<li><strong>Picking:</strong> Host picks a prompt.</li>
						<li><strong>Answering:</strong> Everyone types their answer. Try to guess what most people will say!</li>
						<li><strong>Revealing:</strong> Answers are revealed. The herd wins!</li>
					</ul>
				</section>

				<section class="game-help">
					<h3>🧀 Cheese Thief</h3>
					<p>A social deduction game of dice and deception.</p>
					<ul>
						<li><strong>Roles:</strong> One player is the Thief, others are Sleepyheads, and sometimes a <strong>Fall Mouse</strong>.</li>
						<li><strong>The Night:</strong> Everyone "sleeps" (video blurs). Players wake up at specific hours based on their dice roll.</li>
						<li><strong>The Heist:</strong> The Thief wakes up and decides whether to steal the cheese.</li>
						<li><strong>The Fall Mouse:</strong> Their goal is to get voted out! They win if the group mistakenly thinks they are the thief.</li>
						<li><strong>Voting:</strong> Find the thief! If the Thief is caught, Sleepyheads win. If the group votes for the Fall Mouse, the Fall Mouse wins!</li>
					</ul>
				</section>
			</div>

			<footer class="modal-footer">
				<button class="btn-primary" onclick={onClose}>Got it!</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		backdrop-filter: blur(4px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 10000;
		padding: 2rem;
	}

	.modal-content {
		width: 100%;
		max-width: 600px;
		max-height: 80vh;
		overflow-y: auto;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		box-shadow: 0 25px 50px rgba(0,0,0,0.5);
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid rgba(255,255,255,0.1);
		padding-bottom: 1rem;
	}

	.modal-header h2 {
		font-size: 1.5rem;
		font-weight: 800;
		background: linear-gradient(135deg, #fff 0%, var(--color-accent-light) 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: var(--color-text-muted);
		font-size: 2rem;
		cursor: pointer;
		line-height: 1;
	}

	.close-btn:hover {
		color: #fff;
	}

	.modal-body {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.game-help h3 {
		color: var(--color-accent-light);
		margin-bottom: 0.5rem;
		font-size: 1.1rem;
	}

	.game-help p {
		font-size: 0.95rem;
		line-height: 1.6;
		color: rgba(255, 255, 255, 0.8);
		margin-bottom: 1rem;
	}

	.game-help ul {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.game-help li {
		font-size: 0.9rem;
		color: rgba(255, 255, 255, 0.6);
		padding-left: 1rem;
		position: relative;
	}

	.game-help li::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-accent);
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		padding-top: 1rem;
		border-top: 1px solid rgba(255,255,255,0.1);
	}
</style>
