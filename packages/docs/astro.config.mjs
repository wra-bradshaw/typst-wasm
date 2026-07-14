// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { createStarlightTypeDocPlugin } from 'starlight-typedoc';

const [typstWasmTypeDoc, typstWasmSidebarGroup] = createStarlightTypeDocPlugin();
const [viteTypeDoc, viteSidebarGroup] = createStarlightTypeDocPlugin();

// https://astro.build/config
export default defineConfig({
	site: 'https://wra-bradshaw.github.io/typst-wasm',
	base: '/typst-wasm',
	integrations: [
		starlight({
			title: 'typst-wasm',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/wra-bradshaw/typst-wasm' }],
			plugins: [
				typstWasmTypeDoc({
					entryPoints: [
						'./reference-entrypoints/core.ts',
						'./reference-entrypoints/node.ts',
						'./reference-entrypoints/browser.ts',
						'./reference-entrypoints/workerd.ts',
					],
					tsconfig: './tsconfig.typedoc.json',
					output: 'reference/packages/typst-wasm/api',
					sidebar: { label: 'API', collapsed: true },
					typeDoc: {
						entryPointStrategy: 'resolve',
						exclude: ['**/*.test.ts', '**/internal/**'],
						readme: 'none',
						categorizeByGroup: false,
						hideGenerator: true,
					},
				}),
				viteTypeDoc({
					entryPoints: ['./reference-entrypoints/vite-plugin.ts'],
					tsconfig: './tsconfig.typedoc.json',
					output: 'reference/packages/vite-plugin-typst/api',
					sidebar: { label: 'API', collapsed: true },
					typeDoc: {
						entryPointStrategy: 'resolve',
						exclude: ['**/*.test.ts', '**/internal/**'],
						readme: 'none',
						categorizeByGroup: false,
						hideGenerator: true,
					},
				}),
			],
			sidebar: [
				{ label: 'Tutorials', items: [{ autogenerate: { directory: 'tutorials' } }] },
				{ label: 'How-to guides', items: [{ autogenerate: { directory: 'how-to' } }] },
				{ label: 'Explanation', items: [{ autogenerate: { directory: 'explanation' } }] },
				{
					label: 'Reference',
					items: [
						'reference',
						{
							label: 'typst-wasm',
							items: ['reference/packages/typst-wasm', typstWasmSidebarGroup],
						},
						{
							label: '@typst-wasm/vite-plugin-typst',
							items: ['reference/packages/vite-plugin-typst', viteSidebarGroup],
						},
						'reference/packages/engine-wasm',
						'reference/packages/fonts',
					],
				},
			],
		}),
	],
});
