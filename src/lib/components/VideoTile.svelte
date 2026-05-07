<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		stream: MediaStream | null;
		peerId: string;
		isSelf?: boolean;
		isAsleep?: boolean;
		name: string;
		onToggleAudio?: (enabled: boolean) => void;
		onToggleVideo?: (enabled: boolean) => void;
	}

	let { 
		stream, 
		peerId, 
		isSelf = false, 
		isAsleep = false, 
		name,
		onToggleAudio,
		onToggleVideo
	}: Props = $props();

	let audioEnabled = $state(true);
	let videoEnabled = $state(true);
	let isLocallyMuted = $state(false); // For remote users

	$effect(() => {
		if (stream && isSelf) {
			const aTracks = stream.getAudioTracks();
			const vTracks = stream.getVideoTracks();
			audioEnabled = aTracks.length > 0 && aTracks.every(t => t.enabled);
			videoEnabled = vTracks.length > 0 && vTracks.every(t => t.enabled);
		}
	});

	function handleToggleAudio() {
		if (isSelf) {
			audioEnabled = !audioEnabled;
			onToggleAudio?.(audioEnabled);
		} else {
			isLocallyMuted = !isLocallyMuted;
		}
	}

	function handleToggleVideo() {
		if (isSelf) {
			videoEnabled = !videoEnabled;
			onToggleVideo?.(videoEnabled);
		}
	}

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
	{#if stream && (isSelf || videoEnabled)}
		<video
			use:srcObject={stream}
			autoPlay
			playsInline
			muted={isSelf || isLocallyMuted}
			class="video-el"
			class:video-off={!videoEnabled && isSelf}
		></video>
	{/if}
	
	{#if !stream || (!videoEnabled && isSelf)}
		<div class="placeholder-icon">
			<div class="user-avatar">
				{name.charAt(0).toUpperCase()}
			</div>
		</div>
	{/if}

	<div class="controls-overlay">
		<button 
			class="control-btn" 
			class:off={isSelf ? !audioEnabled : isLocallyMuted}
			onclick={handleToggleAudio}
			title={isSelf ? (audioEnabled ? 'Mute' : 'Unmute') : (isLocallyMuted ? 'Unmute locally' : 'Mute locally')}
		>
			{#if (isSelf ? audioEnabled : !isLocallyMuted)}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
					<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
					<path d="M19 10v1a7 7 0 0 1-14 0v-1"></path>
					<line x1="12" y1="19" x2="12" y2="23"></line>
					<line x1="8" y1="23" x2="16" y2="23"></line>
				</svg>
			{:else}
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
					<line x1="1" y1="1" x2="23" y2="23"></line>
					<path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
					<path d="M17 16.95A7 7 0 0 1 5 11v-1"></path>
					<path d="M23 7l-7 5 7 5V7z"></path>
					<line x1="12" y1="19" x2="12" y2="23"></line>
					<line x1="8" y1="23" x2="16" y2="23"></line>
				</svg>
			{/if}
		</button>

		{#if isSelf}
			<button 
				class="control-btn" 
				class:off={!videoEnabled}
				onclick={handleToggleVideo}
				title={videoEnabled ? 'Stop Video' : 'Start Video'}
			>
				{#if videoEnabled}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
						<polygon points="23 7 16 12 23 17 23 7"></polygon>
						<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
					</svg>
				{:else}
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
						<path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
						<line x1="1" y1="1" x2="23" y2="23"></line>
					</svg>
				{/if}
			</button>
		{/if}
	</div>

	<div class="nametag">
		{name}
		{isAsleep ? '💤' : ''}
		{#if !isSelf && isLocallyMuted}
			<span class="muted-tag">Muted</span>
		{/if}
	</div>
</div>

<style>
	.video-container {
		position: relative;
		width: 100%;
		height: 100%;
		background: #1a1a24;
		border-radius: inherit;
		overflow: hidden;
		transition: all 0.5s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.video-el {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
		transform: scaleX(-1); /* Mirror effect */
	}

	.video-off {
		display: none;
	}

	.placeholder-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #2a2a35 0%, #1a1a24 100%);
	}

	.user-avatar {
		width: 40%;
		aspect-ratio: 1;
		background: var(--color-accent, #7c6af7);
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 2rem;
		font-weight: 700;
		border-radius: 50%;
		box-shadow: 0 8px 16px rgba(0,0,0,0.3);
		text-shadow: 0 2px 4px rgba(0,0,0,0.2);
	}

	.controls-overlay {
		position: absolute;
		bottom: 0.5rem;
		right: 0.5rem;
		display: flex;
		gap: 0.4rem;
		opacity: 0;
		transition: opacity 0.2s ease, transform 0.2s ease;
		transform: translateY(4px);
		z-index: 10;
	}

	.video-container:hover .controls-overlay {
		opacity: 1;
		transform: translateY(0);
	}

	.control-btn {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: white;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.control-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: scale(1.05);
	}

	.control-btn.off {
		background: rgba(240, 96, 96, 0.7);
		border-color: rgba(240, 96, 96, 0.3);
	}

	.icon {
		width: 18px;
		height: 18px;
	}

	.nametag {
		position: absolute;
		bottom: 0.5rem;
		left: 0.5rem;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		padding: 0.25rem 0.6rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		color: #fff;
		pointer-events: none;
		max-width: calc(100% - 4rem);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		display: flex;
		align-items: center;
		gap: 0.3rem;
		border: 1px solid rgba(255, 255, 255, 0.05);
	}

	.muted-tag {
		font-size: 0.6rem;
		background: rgba(240, 96, 96, 0.2);
		color: #ff8080;
		padding: 0.1rem 0.3rem;
		border-radius: 4px;
		text-transform: uppercase;
	}

	/* Cheese Thief Night Phase Blur */
	.sleeping .video-el {
		filter: blur(20px) grayscale(80%) brightness(0.5);
	}
	
	.sleeping .placeholder-icon {
		filter: blur(10px);
	}
</style>
