/**
 * Room route page data loader.
 * The room is dynamic (roomId from URL), so we cannot prerender it.
 * It must be rendered client-side only.
 */
export const prerender = false;
export const ssr = false;

import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	return { roomId: params.roomId };
};
