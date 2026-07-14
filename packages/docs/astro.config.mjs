// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://wra-bradshaw.github.io/typst-wasm',
	base: '/typst-wasm',
	integrations: [
		starlight({
			title: 'typst-wasm',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wra-bradshaw/typst-wasm' }],
			sidebar: [
				{ label: 'Guides', items: [{ autogenerate: { directory: 'guides' } }] },
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
			],
		}),
	],
});
