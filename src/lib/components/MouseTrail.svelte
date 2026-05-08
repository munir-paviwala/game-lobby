<script lang="ts">
	import { onMount } from 'svelte';

	interface Particle {
		id: number;
		x: number;
		y: number;
		size: number;
		color: string;
		vx: number;
		vy: number;
		life: number;
		opacity: number;
	}

	let particles = $state<Particle[]>([]);
	let nextId = 0;

	function createParticle(x: number, y: number) {
		const colors = ['#7c6af7', '#9d8ffb', '#2dd4a1', '#f0b429'];
		const p: Particle = {
			id: nextId++,
			x,
			y,
			size: Math.random() * 4 + 2,
			color: colors[Math.floor(Math.random() * colors.length)],
			vx: (Math.random() - 0.5) * 2,
			vy: Math.random() * 2 + 1, // falling
			life: 1.0,
			opacity: Math.random() * 0.5 + 0.5
		};
		particles.push(p);
		if (particles.length > 50) particles.shift();
	}

	onMount(() => {
		let lastX = 0;
		let lastY = 0;

		const handleMouseMove = (e: MouseEvent) => {
			const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
			if (dist > 10) {
				createParticle(e.clientX, e.clientY);
				lastX = e.clientX;
				lastY = e.clientY;
			}
		};

		let frame: number;
		const update = () => {
			particles = particles
				.map(p => ({
					...p,
					x: p.x + p.vx,
					y: p.y + p.vy,
					life: p.life - 0.02,
					opacity: p.opacity - 0.015
				}))
				.filter(p => p.life > 0);
			
			frame = requestAnimationFrame(update);
		};

		window.addEventListener('mousemove', handleMouseMove);
		frame = requestAnimationFrame(update);

		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			cancelAnimationFrame(frame);
		};
	});
</script>

<div class="mouse-trail" aria-hidden="true">
	{#each particles as p (p.id)}
		<div 
			class="particle" 
			style:left="{p.x}px" 
			style:top="{p.y}px"
			style:width="{p.size}px"
			style:height="{p.size}px"
			style:background={p.color}
			style:opacity={p.opacity}
			style:transform="scale({p.life})"
		></div>
	{/each}
</div>

<style>
	.mouse-trail {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 9999;
		overflow: hidden;
	}

	.particle {
		position: absolute;
		border-radius: 50%;
		filter: blur(1px);
		box-shadow: 0 0 10px currentColor;
		will-change: transform, opacity, left, top;
	}
</style>
