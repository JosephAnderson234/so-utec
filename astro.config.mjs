// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
	markdown: {
		processor: unified({
			remarkPlugins: [remarkMath],
			rehypePlugins: [[rehypeKatex, { strict: false }]],
		}),
	},
	integrations: [
		starlight({
			title: 'CS3015 · SO',
			description: 'Web de estudio interactiva para el E1 de Sistemas Operativos (UTEC).',
			locales: { root: { label: 'Español', lang: 'es' } },
			customCss: ['@fontsource-variable/inter', '@fontsource-variable/jetbrains-mono', 'katex/dist/katex.min.css', './src/styles/custom.css'],
			components: { Head: './src/components/Head.astro' },
			pagination: true,
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 2 },
			expressiveCode: { themes: ['github-dark-dimmed', 'github-light'], styleOverrides: { borderRadius: '12px' } },
			sidebar: [
				{
					label: 'Inicio',
					items: [
						{ label: 'Cómo usar esta web', slug: 'index' },
						{ label: 'Formulario (cheat sheet)', slug: 'formulario' },
						{ label: 'Mapa del examen', slug: 'mapa' },
					],
				},
				{
					label: '1 · Procesos y threads',
					items: [
						{ label: 'fork, exec y contar «Hello!»', slug: 'procesos/fork' },
						{ label: 'Modelos de threads y pthreads', slug: 'procesos/threads' },
					],
				},
				{
					label: '2 · Exclusión mutua',
					items: [
						{ label: 'Requisitos y cómo demostrar', slug: 'mutex/requisitos' },
						{ label: 'Algoritmos: Peterson, Hyman, Flaky…', slug: 'mutex/algoritmos' },
						{ label: 'Bakery de Lamport', slug: 'mutex/bakery' },
					],
				},
				{
					label: '3 · Hardware y registros',
					items: [
						{ label: 'Operaciones atómicas y spinlocks', slug: 'hardware/atomicas' },
						{ label: 'Registros safe/regular/atomic', slug: 'hardware/registros', badge: { text: 'nuevo', variant: 'tip' } },
					],
				},
				{
					label: '4 · Semáforos',
					items: [
						{ label: 'Semáforos y su implementación', slug: 'semaforos/basicos' },
						{ label: 'Productor–consumidor y deadlock', slug: 'semaforos/productor-consumidor' },
						{ label: 'Problemas clásicos (Morris, aretes…)', slug: 'semaforos/clasicos' },
					],
				},
				{
					label: '5 · Monitores',
					items: [
						{ label: 'Monitores: Hoare vs Mesa', slug: 'monitores/monitores', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'Lectores–escritores', slug: 'monitores/lectores-escritores', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'Baño unisex y cine', slug: 'monitores/problemas' },
					],
				},
				{
					label: '6 · Memoria',
					items: [
						{ label: 'Particiones, buddy y placement', slug: 'memoria/particiones', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'MMU y segmentación', slug: 'memoria/segmentacion', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'Paginación y tablas multinivel', slug: 'memoria/paginacion' },
					],
				},
				{
					label: '7 · Exámenes previos',
					items: [
						{ label: 'E1 2026-1 (mayo)', slug: 'examen/e1-2026-1' },
						{ label: 'E1 2025-2', slug: 'examen/e1-2025-2' },
						{ label: 'E1 2024 (I y II)', slug: 'examen/e1-2024' },
						{ label: 'PC1 2021 y E1 2022', slug: 'examen/e1-2021-2022' },
						{ label: 'Flashcards y simulacro', slug: 'examen/flashcards' },
					],
				},
			],
		}),
		react(),
	],
});
