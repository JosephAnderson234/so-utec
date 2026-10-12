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
			description: 'Web de estudio interactiva de Sistemas Operativos (UTEC): parcial E1 y etapa final.',
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
						{ label: 'Mapa del parcial (E1)', slug: 'mapa' },
					],
				},
				{
					label: 'Final · LC3 y examen final',
					badge: { text: 'nuevo', variant: 'success' },
					items: [
						{ label: 'Mapa de temas del final', slug: 'final' },
						{
							label: 'A · Deadlock en la práctica (cap. 6)',
							items: [
								{ label: 'Teoría base: Coffman y banquero', link: '/semaforos/deadlock/' },
								{ label: 'Deadlock de un hilo, trylock y livelock', slug: 'final/deadlock/livelock-trylock' },
								{ label: 'Filósofos: las 8 versiones', slug: 'final/deadlock/filosofos' },
								{ label: 'Barbero dormilón (1 y N)', slug: 'final/deadlock/barbero' },
								{ label: 'Mecanismos de UNIX y Linux', slug: 'final/deadlock/mecanismos-kernel' },
							],
						},
						{
							label: 'B · Gestión de memoria (cap. 7)',
							items: [
								{ label: 'Particiones, buddy y placement', slug: 'memoria/particiones' },
								{ label: 'MMU y segmentación', slug: 'memoria/segmentacion' },
								{ label: 'Paginación y tablas multinivel', slug: 'memoria/paginacion' },
							],
						},
						{
							label: 'C · Memoria virtual (cap. 8)',
							items: [
								{ label: 'Hardware y fallo de página', slug: 'final/memoria-virtual/fundamentos' },
								{ label: 'Reemplazo: OPT, LRU, FIFO, Clock', slug: 'final/memoria-virtual/reemplazo' },
								{ label: 'Working set, limpieza y carga', slug: 'final/memoria-virtual/conjunto-residente' },
								{ label: 'UNIX, Solaris y Linux', slug: 'final/memoria-virtual/unix-linux' },
							],
						},
						{
							label: 'D · Linux en la práctica (labs 10)',
							items: [
								{ label: 'Memoria de un proceso', slug: 'final/linux/espacio-direcciones' },
								{ label: 'Valgrind y perf', slug: 'final/linux/valgrind-perf' },
							],
						},
						{
							label: 'E · Ejercicios resueltos',
							items: [
								{ label: 'Page Replacement (4)', slug: 'final/ejercicios/page-replacement' },
								{ label: 'Virtual Memory (6)', slug: 'final/ejercicios/memoria-virtual' },
							],
						},
						{ label: 'Repaso y simulacro del LC3', slug: 'final/repaso', badge: { text: 'LC3', variant: 'caution' } },
					],
				},
				{
					label: 'Parcial · E1 (unidades 0–5)',
					collapsed: true,
					items: [
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
								{ label: 'Demostraciones formales', slug: 'mutex/demostraciones', badge: { text: 'nuevo', variant: 'tip' } },
								{ label: 'N procesos: Dijkstra 1965', slug: 'mutex/n-procesos' },
								{ label: 'Bakery de Lamport', slug: 'mutex/bakery' },
							],
						},
						{
							label: '3 · Hardware, POSIX y registros',
							items: [
								{ label: 'Operaciones atómicas y spinlocks', slug: 'hardware/atomicas' },
								{ label: 'Mutex POSIX, futex y semáforos POSIX', slug: 'hardware/futex', badge: { text: 'nuevo', variant: 'tip' } },
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
							label: '6 · Exámenes previos',
							items: [
								{ label: 'E1 2026-1 (mayo)', slug: 'examen/e1-2026-1' },
								{ label: 'E1 2025-2', slug: 'examen/e1-2025-2' },
								{ label: 'E1 2024 (I y II)', slug: 'examen/e1-2024' },
								{ label: 'PC1 2021 y E1 2022', slug: 'examen/e1-2021-2022' },
								{ label: 'Los 32 ejercicios de sincronización', slug: 'examen/ejercicios' },
								{ label: 'Flashcards y simulacro', slug: 'examen/flashcards' },
							],
						},
						{
							label: '7 · Simulacros E1 2026-2',
							items: [
								{ label: 'Predicción y cómo usarlos', slug: 'examen/prediccion', badge: { text: 'nuevo', variant: 'tip' } },
								{ label: 'Simulacro 1 · estilo 2026-1', slug: 'examen/simulacro-1' },
								{ label: 'Simulacro 2 · estilo 2024-II/2025-2', slug: 'examen/simulacro-2' },
								{ label: 'Simulacro 3 · temas nuevos', slug: 'examen/simulacro-3' },
							],
						},
					],
				},
			],
		}),
		react(),
	],
});
