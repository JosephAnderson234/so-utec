export type Tema = { id: string; t: string; href: string; u: string; peso: 1 | 2 | 3 };

/** Temas del final; `peso` estima cuánto pesa en el LC3 (3 = código o análisis casi seguro, 1 = teoría de apoyo). */
export const TEMAS: Tema[] = [
	{ id: 'monitores', t: 'Monitores y variables de condición', href: '/monitores/monitores/', u: '0', peso: 2 },
	{ id: 'lectores-escritores', t: 'Lectores–escritores', href: '/monitores/lectores-escritores/', u: '0', peso: 2 },
	{ id: 'registros', t: 'Registros safe, regular y atomic', href: '/hardware/registros/', u: '0', peso: 1 },
	{ id: 'deadlock-base', t: 'Coffman, prevención y banquero', href: '/semaforos/deadlock/', u: 'A', peso: 3 },
	{ id: 'teoria-sem11', t: 'Clase de teoría sem. 11', href: '/final/deadlock/teoria-sem11/', u: 'A', peso: 3 },
	{ id: 'livelock', t: 'Trylock y livelock', href: '/final/deadlock/livelock-trylock/', u: 'A', peso: 2 },
	{ id: 'filosofos', t: 'Filósofos (8 versiones)', href: '/final/deadlock/filosofos/', u: 'A', peso: 3 },
	{ id: 'barbero', t: 'Barbero dormilón', href: '/final/deadlock/barbero/', u: 'A', peso: 3 },
	{ id: 'mecanismos-kernel', t: 'Mecanismos de UNIX y Linux', href: '/final/deadlock/mecanismos-kernel/', u: 'A', peso: 2 },
	{ id: 'particiones', t: 'Particiones, buddy y placement', href: '/memoria/particiones/', u: 'B', peso: 2 },
	{ id: 'segmentacion', t: 'MMU y segmentación', href: '/memoria/segmentacion/', u: 'B', peso: 3 },
	{ id: 'paginacion', t: 'Paginación, multinivel y TLB', href: '/memoria/paginacion/', u: 'B', peso: 3 },
	{ id: 'mv-fundamentos', t: 'Hardware de MV y page fault', href: '/final/memoria-virtual/fundamentos/', u: 'C', peso: 3 },
	{ id: 'reemplazo', t: 'Reemplazo: OPT, LRU, FIFO, Clock', href: '/final/memoria-virtual/reemplazo/', u: 'C', peso: 3 },
	{ id: 'conjunto-residente', t: 'Working set y thrashing', href: '/final/memoria-virtual/conjunto-residente/', u: 'C', peso: 2 },
	{ id: 'unix-linux', t: 'Memoria en UNIX y Linux', href: '/final/memoria-virtual/unix-linux/', u: 'C', peso: 1 },
	{ id: 'espacio-direcciones', t: 'Memoria de un proceso', href: '/final/linux/espacio-direcciones/', u: 'D', peso: 2 },
	{ id: 'valgrind', t: 'Valgrind y perf', href: '/final/linux/valgrind-perf/', u: 'D', peso: 3 },
	{ id: 'ej-page-replacement', t: 'Ejercicios: Page Replacement', href: '/final/ejercicios/page-replacement/', u: 'E', peso: 3 },
	{ id: 'ej-memoria-virtual', t: 'Ejercicios: Virtual Memory', href: '/final/ejercicios/memoria-virtual/', u: 'E', peso: 3 },
	{ id: 'stallings-6', t: 'Stallings cap. 6', href: '/final/stallings/cap6/', u: 'F', peso: 2 },
	{ id: 'stallings-7', t: 'Stallings cap. 7', href: '/final/stallings/cap7/', u: 'F', peso: 2 },
	{ id: 'stallings-8', t: 'Stallings cap. 8', href: '/final/stallings/cap8/', u: 'F', peso: 2 },
];

export const NIVELES = [
	'No lo reconozco o lo confundo con otro tema',
	'Lo entiendo leyendo, pero no lo aplico solo',
	'Resuelvo ejercicios parecidos a los vistos, con alguna pista',
	'Resuelvo uno nuevo sin ayuda y justifico cada paso',
	'Lo transfiero: comparo alternativas y veo casos límite',
];

/** Días hasta el próximo repaso según el nivel (repaso espaciado). */
export const INTERVALO = [0, 1, 2, 4, 7];

export type Registro = { nivel: number; fecha: string };
export const clave = (id: string) => `dominio:${id}`;

export function proximo(r: Registro): Date {
	const d = new Date(r.fecha);
	d.setDate(d.getDate() + INTERVALO[r.nivel]);
	return d;
}
