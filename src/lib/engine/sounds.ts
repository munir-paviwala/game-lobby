/**
 * engine/sounds.ts
 * A lightweight sound utility using the Web Audio API.
 * Generates synthesized sound effects without external assets.
 */

let audioCtx: AudioContext | null = null;

function getCtx() {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
	}
	return audioCtx;
}

/**
 * Play a simple beep/tone.
 */
function playTone(freq: number, type: OscillatorType, duration: number, volume = 0.1) {
	try {
		const ctx = getCtx();
		if (ctx.state === 'suspended') ctx.resume();

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = type;
		osc.frequency.setValueAtTime(freq, ctx.currentTime);

		gain.gain.setValueAtTime(volume, ctx.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start();
		osc.stop(ctx.currentTime + duration);
	} catch (e) {
		console.warn('Audio play failed:', e);
	}
}

/** 🛎️ "Ding" - correct answer / notification */
export function playDing() {
	playTone(880, 'sine', 0.5, 0.1);
	setTimeout(() => playTone(1109, 'sine', 0.5, 0.08), 50);
}

/** 🎲 "Dice" - rapid clicks */
export function playDice() {
	for (let i = 0; i < 5; i++) {
		setTimeout(() => {
			playTone(200 + Math.random() * 400, 'square', 0.05, 0.05);
		}, i * 60);
	}
}

/** 🤫 "Shhh" - white noise for night phase */
export function playShhh() {
	try {
		const ctx = getCtx();
		if (ctx.state === 'suspended') ctx.resume();

		const bufferSize = ctx.sampleRate * 0.5;
		const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
		const data = buffer.getChannelData(0);

		for (let i = 0; i < bufferSize; i++) {
			data[i] = Math.random() * 2 - 1;
		}

		const noise = ctx.createBufferSource();
		noise.buffer = buffer;

		const gain = ctx.createGain();
		gain.gain.setValueAtTime(0, ctx.currentTime);
		gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.1);
		gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

		noise.connect(gain);
		gain.connect(ctx.destination);

		noise.start();
	} catch (e) {
		console.warn('Audio play failed:', e);
	}
}

/** 📉 "Pop" - UI interaction */
export function playPop() {
	playTone(400, 'sine', 0.1, 0.05);
}
