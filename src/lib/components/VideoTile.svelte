<script lang="ts">
	import type { GameState } from '$lib/engine/types';

	interface Props {
		stream: MediaStream | null;
		peerId: string;
		isSelf?: boolean;
		isAsleep?: boolean;
		name: string;
	}

	let { stream, peerId, isSelf = false, isAsleep = false, name }: Props = $props();

	function srcObject(node: HTMLVideoElement, stream: MediaStream | null) {
		if (stream) {
			node.srcObject = stream;
			node.onloadedmetadata = () => {
				node.play().catch(e => console.warn('Autoplay blocked:', e));
			};
		}
		return {
			update(newStream: MediaStream | null) {
				if (node.srcObject !== newStream) {
					node.srcObject = newStream;
				}
			}
		};
	}
</script>

<div class="video-container" class:local={isSelf} class:sleeping={isAsleep}>
	{#if stream}
		<video
			use:srcObject={stream}
			autoPlay
			playsInline
			muted={isSelf}
			class="video-el"
		></video>
	{:else}
		<div class="placeholder-icon">👤</div>
	{/if}

	<div class="nametag">
		{name}
		{isAsleep ? '💤' : ''}
	</div>
</div>

<style>
	.video-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #111;
		border-radius: inherit;
		overflow: hidden;
		transition: all 0.5s ease;
	}

	.video-el {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transform: scaleX(-1); /* Mirror effect */
	}

	.placeholder-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 2rem;
		opacity: 0.3;
	}

	.nametag {
		position: absolute;
		bottom: 0.35rem;
		left: 0.35rem;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		-webkit-backdrop-filter: blur(4px);
		padding: 0.15rem 0.45rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		color: #fff;
		pointer-events: none;
		max-width: calc(100% - 0.7rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Cheese Thief Night Phase Blur */
	.sleeping .video-el {
		filter: blur(15px) grayscale(50%) brightness(0.7);
	}
</style>
