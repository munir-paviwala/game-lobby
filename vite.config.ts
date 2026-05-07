import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
	plugins: [sveltekit(), basicSsl()],
	server: {
		host: true // allow mobile devices on local network to connect
	}
});
