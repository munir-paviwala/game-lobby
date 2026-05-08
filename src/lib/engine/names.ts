const ADJECTIVES = [
	'butter', 'chocolate', 'minty', 'spicy', 'sweet', 'sour', 'salty', 'crunchy', 'fluffy',
	'speedy', 'lazy', 'funky', 'glitzy', 'sneaky', 'brave', 'goofy', 'mellow', 'zesty',
	'atomic', 'cosmic', 'neon', 'frozen', 'golden', 'silver', 'velvet', 'royal', 'wild'
];

const NOUNS = [
	'cookie', 'muffin', 'waffle', 'donut', 'pizza', 'taco', 'burger', 'noodle', 'sushi', 'chocolate', 'caramel', 'vanilla', 'honey', 'berry',
	'panda', 'koala', 'tiger', 'rabbit', 'otter', 'penguin', 'falcon', 'dragon', 'unicorn',
	'robot', 'ninja', 'pirate', 'wizard', 'cactus', 'rocket', 'comet', 'nebula', 'pixel'
];

export function generateFunnyName(): string {
	const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
	const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
	const num = Math.floor(Math.random() * 900) + 100;
	return `${adj}-${noun}-${num}`;
}
