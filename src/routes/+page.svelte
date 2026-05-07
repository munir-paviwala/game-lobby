<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Game Lobby — Play Board Games with Friends</title>
	<meta
		name="description"
		content="Play board games with friends online. No installs, no accounts — just open a link and play."
	/>
</svelte:head>

<main class="home">
	<!-- Background ambient blobs -->
	<div class="blob blob-1" aria-hidden="true"></div>
	<div class="blob blob-2" aria-hidden="true"></div>

	<div class="hero">
		<div class="logo-mark" aria-hidden="true">🎲</div>
		<h1 class="title">Game Lobby</h1>
		<p class="subtitle">
			Play board games with friends — no accounts, no installs, no servers.<br />
			Just share a link and start playing.
		</p>

		<div class="cta-group">
			<a href="/lobby/" class="btn-primary" id="cta-create">
				<span>Create a Room</span>
				<span class="arrow">→</span>
			</a>
			<a href="/lobby/?join=true" class="btn-ghost" id="cta-join">Join a Room</a>
		</div>
	</div>

	<section class="features" aria-label="Features">
		<div class="feature-card">
			<div class="feature-icon" aria-hidden="true">🔒</div>
			<h2>Private Rooms</h2>
			<p>Password-protect your game room so only your friends can join.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon" aria-hidden="true">📡</div>
			<h2>Peer-to-Peer</h2>
			<p>No servers — your game data goes directly between players.</p>
		</div>
		<div class="feature-card">
			<div class="feature-icon" aria-hidden="true">📹</div>
			<h2>Video Included</h2>
			<p>See your friends' reactions in real-time with built-in video chat.</p>
		</div>
	</section>
</main>

<style>
	.home {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 1.5rem;
		position: relative;
		overflow: hidden;
		min-height: 100vh;
		gap: 5rem;
	}

	/* Ambient background blobs */
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		pointer-events: none;
		z-index: 0;
	}

	.blob-1 {
		width: 500px;
		height: 500px;
		background: radial-gradient(circle, rgba(124, 106, 247, 0.25), transparent 70%);
		top: -100px;
		left: -150px;
		animation: float 14s ease-in-out infinite;
	}

	.blob-2 {
		width: 400px;
		height: 400px;
		background: radial-gradient(circle, rgba(45, 212, 161, 0.15), transparent 70%);
		bottom: -80px;
		right: -100px;
		animation: float 18s ease-in-out infinite reverse;
	}

	@keyframes float {
		0%, 100% { transform: translate(0, 0) scale(1); }
		33% { transform: translate(30px, -20px) scale(1.05); }
		66% { transform: translate(-20px, 15px) scale(0.97); }
	}

	/* Hero section */
	.hero {
		position: relative;
		z-index: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
		max-width: 600px;
	}

	.logo-mark {
		font-size: 4.5rem;
		line-height: 1;
		filter: drop-shadow(0 0 20px rgba(124, 106, 247, 0.5));
		animation: dice-bob 4s ease-in-out infinite;
	}

	@keyframes dice-bob {
		0%, 100% { transform: translateY(0) rotate(0deg); }
		50% { transform: translateY(-8px) rotate(6deg); }
	}

	.title {
		font-size: clamp(2.5rem, 6vw, 4rem);
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.1;
		background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.6) 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.subtitle {
		font-size: 1.1rem;
		line-height: 1.7;
		color: rgba(232, 232, 240, 0.6);
		max-width: 480px;
	}

	.cta-group {
		display: flex;
		gap: 0.875rem;
		flex-wrap: wrap;
		justify-content: center;
		margin-top: 0.5rem;
	}

	.cta-group a {
		text-decoration: none;
		font-size: 1rem;
	}

	.arrow {
		transition: transform 0.2s ease;
	}

	.cta-group a:hover .arrow {
		transform: translateX(4px);
	}

	/* Features grid */
	.features {
		position: relative;
		z-index: 1;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1.25rem;
		width: 100%;
		max-width: 760px;
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 16px;
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: background 0.2s ease, transform 0.2s ease;
	}

	.feature-card:hover {
		background: rgba(255, 255, 255, 0.07);
		transform: translateY(-3px);
	}

	.feature-icon {
		font-size: 1.75rem;
		line-height: 1;
	}

	.feature-card h2 {
		font-size: 1rem;
		font-weight: 700;
		color: #fff;
	}

	.feature-card p {
		font-size: 0.875rem;
		line-height: 1.6;
		color: rgba(232, 232, 240, 0.55);
	}
</style>
