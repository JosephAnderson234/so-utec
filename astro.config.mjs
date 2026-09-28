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
					label: '0 · Fundamentos',
					items: [
						{ label: 'Hardware: interrupciones y memoria', slug: 'fundamentos/hardware' },
						{ label: '¿Qué es un SO? Evolución y kernel', slug: 'fundamentos/sistema-operativo' },
					],
				},
				{
					label: '1 · Procesos y threads',
					items: [
						{ label: 'Estados, PCB y cambio de proceso', slug: 'procesos/estados' },
						{ label: 'Syscalls, exec, wait y señales', slug: 'procesos/syscalls-senales' },
						{ label: 'fork y contar «Hello!»', slug: 'procesos/fork' },
						{ label: 'Threads: teoría y pthreads', slug: 'procesos/threads' },
						{ label: 'Selfie: syscalls y procesos', slug: 'procesos/selfie' },
					],
				},
				{
					label: '2 · Exclusión mutua',
					items: [
						{ label: 'Requisitos y cómo demostrar', slug: 'mutex/requisitos' },
						{ label: 'Algoritmos: Peterson, Hyman, Flaky…', slug: 'mutex/algoritmos' },
						{ label: 'N procesos: Dijkstra 1965', slug: 'mutex/n-procesos' },
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
					label: '4 · Semáforos y deadlock',
					items: [
						{ label: 'Semáforos y su implementación', slug: 'semaforos/basicos' },
						{ label: 'Productor–consumidor y deadlock', slug: 'semaforos/productor-consumidor' },
						{ label: 'Problemas clásicos (Morris, aretes…)', slug: 'semaforos/clasicos' },
						{ label: 'Deadlock: banquero y filósofos', slug: 'semaforos/deadlock' },
					],
				},
				{
					label: '5 · Monitores y mensajes',
					items: [
						{ label: 'Monitores: Hoare vs Mesa', slug: 'monitores/monitores', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'Lectores–escritores', slug: 'monitores/lectores-escritores', badge: { text: 'nuevo', variant: 'tip' } },
						{ label: 'Baño unisex y cine', slug: 'monitores/problemas' },
						{ label: 'Paso de mensajes', slug: 'monitores/mensajes' },
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
						{ label: 'Los 32 ejercicios de sincronización', slug: 'examen/ejercicios' },
						{ label: 'Flashcards y simulacro', slug: 'examen/flashcards' },
					],
				},
			],
		}),
		react(),
	],
});
