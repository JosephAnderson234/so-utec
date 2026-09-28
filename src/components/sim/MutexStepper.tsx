import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Vars = Record<string, number | boolean | (number | boolean)[]>;
type State = { pc: [number, number]; v: Vars };
type Algo = {
	id: string;
	name: string;
	fuente: string;
	lines: string[]; // código de P_i (i = yo, j = el otro)
	ncs: number;
	cs: number;
	init: () => Vars;
	step: (s: State, i: 0 | 1) => State;
	nota: string;
};

const clone = (s: State): State => ({ pc: [s.pc[0], s.pc[1]], v: JSON.parse(JSON.stringify(s.v)) });
const arr = (v: Vars, k: string) => v[k] as boolean[];

function mk(pcTo: (s: State, i: 0 | 1, j: 0 | 1, n: State) => number): Algo['step'] {
	return (s, i) => {
		const n = clone(s);
		const j = (1 - i) as 0 | 1;
		n.pc[i] = pcTo(s, i, j, n);
		return n;
	};
}

const ALGOS: Algo[] = [
	{
		id: 'naive-lock',
		name: 'Lock ingenuo (clase 05 · intento 1)',
		fuente: '05-OSL-Mutual exclusion Algorithms, diap. 25–30',
		lines: ['// sección no crítica', 'while (lock != 0) ;', 'lock = 1;', '/* SECCIÓN CRÍTICA */', 'lock = 0;'],
		ncs: 0,
		cs: 3,
		init: () => ({ lock: 0 }),
		step: mk((s, i, _j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: return s.v.lock !== 0 ? 1 : 2;
				case 2: n.v.lock = 1; return 3;
				case 3: return 4;
				default: n.v.lock = 0; return 0;
			}
		}),
		nota: 'Leer lock y escribir lock = 1 son DOS operaciones (check-then-act): si ambos leen 0 antes de que alguno escriba, entran los dos. La solución real es un test-and-set atómico.',
	},
	{
		id: 'strict',
		name: 'Alternancia estricta (clase 05 · intento 2)',
		fuente: '05-OSL diap. 32–37 · 06-OSL Listing 3',
		lines: ['// sección no crítica', 'while (order != i) ;', '/* SECCIÓN CRÍTICA */', 'order = j;'],
		ncs: 0,
		cs: 2,
		init: () => ({ order: 1 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: return s.v.order !== i ? 1 : 2;
				case 2: return 3;
				default: n.v.order = j; return 0;
			}
		}),
		nota: 'Cumple la exclusión mutua, pero viola el PROGRESO: si el otro hilo se queda en su sección no crítica (o termina), quien quiere entrar espera para siempre. El buscador lo detecta como «violación de progreso». Además obliga a alternar 0,1,0,1…',
	},
	{
		id: 'interest-if',
		name: 'Interés + alternancia con if (clase 05 · diap. 46)',
		fuente: '05-OSL diap. 46–51: «¿puedes dar un ejemplo donde no basta?»',
		lines: ['// sección no crítica', 'interest[i] = true;', 'if (interest[j])', '    while (order != i) ;', '/* SECCIÓN CRÍTICA */', 'order = j;', 'interest[i] = false;'],
		ncs: 0,
		cs: 4,
		init: () => ({ interest: [false, false], order: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'interest')[i] = true; return 2;
				case 2: return arr(s.v, 'interest')[j] ? 3 : 4;
				case 3: return s.v.order !== i ? 3 : 4;
				case 4: return 5;
				case 5: n.v.order = j; return 6;
				default: arr(n.v, 'interest')[i] = false; return 0;
			}
		}),
		nota: 'NO basta: con order = 0, P1 marca interés y ve interest[0] = F, así que SALTA la espera y entra. Luego P0 marca interés, ve interest[1] = T, espera a order == 0… que ya es 0, y también entra. El que salta el if no mira order.',
	},
	{
		id: 'interest-while',
		name: 'Interés + alternancia con while (lab 06 · Listing 5)',
		fuente: '06-OSL-Mutex.pdf, Listing 5',
		lines: ['// sección no crítica', 'interest[i] = 1;', 'while (interest[j]) {', '    interest[i] = 0;', '    while (order != i) ;', '    interest[i] = 1; }', '/* SECCIÓN CRÍTICA */', 'order = j;', 'interest[i] = 0;'],
		ncs: 0,
		cs: 6,
		init: () => ({ interest: [false, false], order: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'interest')[i] = true; return 2;
				case 2: return arr(s.v, 'interest')[j] ? 3 : 6;
				case 3: arr(n.v, 'interest')[i] = false; return 4;
				case 4: return s.v.order !== i ? 4 : 5;
				case 5: arr(n.v, 'interest')[i] = true; return 2;
				case 6: return 7;
				case 7: n.v.order = j; return 8;
				default: arr(n.v, 'interest')[i] = false; return 0;
			}
		}),
		nota: 'Resultado exhaustivo: ✔ exclusión mutua (cada hilo marca su interés ANTES de mirar el del otro), ✔ sin deadlock, ✔ progreso, pero ✘ STARVATION: P0 cede (interest[0] = 0), pasa el while(order != 0) porque order ya es 0 y vuelve a subir su interés; en esa ventana P1 ve interest[0] = 0 y entra. Al salir, P1 deja order = 0 otra vez y el ciclo se repite. Pulsa «¿Starvation?». (El resumen previo de lab2 lo llamaba «≈ Peterson, sin starvation»: es incorrecto.)',
	},
	{
		id: 'dekker',
		name: 'Dekker (Stallings fig. 5.2)',
		fuente: 'Stallings §5.1 · 05-OSL-Mutual_exclusion_demostrations',
		lines: ['// sección no crítica', 'flag[i] = true;', 'while (flag[j]) {', '    if (turn == j) {', '        flag[i] = false;', '        while (turn == j) ;', '        flag[i] = true; } }', '/* SECCIÓN CRÍTICA */', 'turn = j;', 'flag[i] = false;'],
		ncs: 0,
		cs: 7,
		init: () => ({ flag: [false, false], turn: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'flag')[i] = true; return 2;
				case 2: return arr(s.v, 'flag')[j] ? 3 : 7;
				case 3: return s.v.turn === j ? 4 : 2;
				case 4: arr(n.v, 'flag')[i] = false; return 5;
				case 5: return s.v.turn === j ? 5 : 6;
				case 6: arr(n.v, 'flag')[i] = true; return 2;
				case 7: return 8;
				case 8: n.v.turn = j; return 9;
				default: arr(n.v, 'flag')[i] = false; return 0;
			}
		}),
		nota: 'El primer algoritmo correcto para 2 procesos: combina flags (intentos 2–4) con turn (intento 1). Mutex, deadlock-free y starvation-free. El buscador no encontrará contraejemplos.',
	},
	{
		id: 'dijkstra2',
		name: 'Dijkstra del lab 06 (con N = 2)',
		fuente: '06-OSL-Mutex.pdf · Dijkstra 1965',
		lines: ['// sección no crítica', 'interest[i] = 1;', 'while (interest[j]) {', '    if (order != i) {', '        interest[i] = 0;', '        while (order != -1) ;', '        order = i;', '        interest[i] = 1; } }', '/* SECCIÓN CRÍTICA */', 'order = -1;', 'interest[i] = 0;'],
		ncs: 0,
		cs: 8,
		init: () => ({ interest: [false, false], order: -1 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'interest')[i] = true; return 2;
				case 2: return arr(s.v, 'interest')[j] ? 3 : 8;
				case 3: return s.v.order !== i ? 4 : 2;
				case 4: arr(n.v, 'interest')[i] = false; return 5;
				case 5: return s.v.order !== -1 ? 5 : 6;
				case 6: n.v.order = i; return 7;
				case 7: arr(n.v, 'interest')[i] = true; return 2;
				case 8: return 9;
				case 9: n.v.order = -1; return 10;
				default: arr(n.v, 'interest')[i] = false; return 0;
			}
		}),
		nota: 'Resultado exhaustivo: ✔ exclusión mutua, ✔ sin deadlock, ✔ progreso, ✘ starvation posible (pulsa «¿Starvation?»). Coincide con lo que se sabe del algoritmo de Dijkstra de 1965: garantiza que ALGUIEN entra, pero no que TÚ entres (Knuth, 1966, fue el primero en acotar la espera). El paper original usa dos arreglos b[] y c[].',
	},
	{
		id: 'dijkstra1965',
		name: 'Dijkstra 1965 real (b[], c[], k) con N = 2',
		fuente: 'lab2/dijskstra proff.pdf (CACM 8(9), 1965)',
		lines: ['// sección no crítica', 'Li0: b[i] := false;', 'Li1: if (k ≠ i) {', '    Li2: c[i] := true;', '    Li3: if (b[k])', '             k := i;  goto Li1 }', 'else { Li4: c[i] := false;', '    for j ≠ i: if (!c[j]) goto Li1 }', '/* SECCIÓN CRÍTICA */', 'c[i] := true;', 'b[i] := true;'],
		ncs: 0,
		cs: 8,
		init: () => ({ b: [true, true], c: [true, true], k: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'b')[i] = false; return 2;
				case 2: return s.v.k !== i ? 3 : 6;
				case 3: arr(n.v, 'c')[i] = true; return 4;
				case 4: return arr(s.v, 'b')[s.v.k as number] ? 5 : 2;
				case 5: n.v.k = i; return 2;
				case 6: arr(n.v, 'c')[i] = false; return 7;
				case 7: return !arr(s.v, 'c')[j] ? 2 : 8;
				case 8: return 9;
				case 9: arr(n.v, 'c')[i] = true; return 10;
				default: arr(n.v, 'b')[i] = true; return 0;
			}
		}),
		nota: 'El algoritmo del paper, línea por línea (la lectura de b[k] y la escritura k := i son pasos separados). Resultado exhaustivo: ✔ exclusión mutua, ✔ sin deadlock (la propiedad (d) del paper: nada de «after you – after you»), pero ✘ STARVATION: el dueño de k puede reentrar una y otra vez. Por eso Knuth (1966) propuso la primera solución con espera acotada.',
	},
	{
		id: 'peterson',
		name: 'Peterson (PC1 2021: FLAG / AFTER_YOU)',
		fuente: 'PC1 2021, P1(b)',
		lines: ['// sección no crítica', 'FLAG[i] ← up;', 'AFTER_YOU ← i;', 'wait (FLAG[j] = down ∨ AFTER_YOU ≠ i);', '/* SECCIÓN CRÍTICA */', 'FLAG[i] ← down;'],
		ncs: 0,
		cs: 4,
		init: () => ({ FLAG: [false, false], AFTER_YOU: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'FLAG')[i] = true; return 2;
				case 2: n.v.AFTER_YOU = i; return 3;
				case 3: return !arr(s.v, 'FLAG')[j] || s.v.AFTER_YOU !== i ? 4 : 3;
				case 4: return 5;
				default: arr(n.v, 'FLAG')[i] = false; return 0;
			}
		}),
		nota: 'Cumple las tres: exclusión mutua, sin deadlock y sin starvation (espera acotada a 1 turno). Intenta encontrar un contraejemplo: el buscador no hallará ninguno.',
	},
	{
		id: 'peterson-std',
		name: 'Peterson (Stallings fig. 5.3 / diapositivas)',
		fuente: 'Stallings §5.1 · 06-OSL-Mutual_exclusion algorithms_demostrations',
		lines: ['// sección no crítica', 'flag[i] = true;', 'turn = j;', 'while (flag[j] && turn == j) ;', '/* SECCIÓN CRÍTICA */', 'flag[i] = false;'],
		ncs: 0,
		cs: 4,
		init: () => ({ flag: [false, false], turn: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'flag')[i] = true; return 2;
				case 2: n.v.turn = j; return 3;
				case 3: return arr(s.v, 'flag')[j] && s.v.turn === j ? 3 : 4;
				case 4: return 5;
				default: arr(n.v, 'flag')[i] = false; return 0;
			}
		}),
		nota: 'La versión de las diapositivas. Se comporta igual que la del PC1 2021 (allí AFTER_YOU ← i equivale a turn = j). Ninguno de los dos buscadores encuentra nada: mutex, deadlock-free y starvation-free.',
	},
	{
		id: 'peterson-swap',
		name: 'Peterson con el orden invertido (turn antes que flag)',
		fuente: 'Variante típica de examen: ¿importa el orden de las dos escrituras?',
		lines: ['// sección no crítica', 'turn = j;', 'flag[i] = true;', 'while (flag[j] && turn == j) ;', '/* SECCIÓN CRÍTICA */', 'flag[i] = false;'],
		ncs: 0,
		cs: 4,
		init: () => ({ flag: [false, false], turn: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: n.v.turn = j; return 2;
				case 2: arr(n.v, 'flag')[i] = true; return 3;
				case 3: return arr(s.v, 'flag')[j] && s.v.turn === j ? 3 : 4;
				case 4: return 5;
				default: arr(n.v, 'flag')[i] = false; return 0;
			}
		}),
		nota: '¡El orden SÍ importa! P0 escribe turn = 1; P1 escribe turn = 0 y flag[1] = T, ve flag[0] = F y entra. P0 escribe flag[0] = T y ve turn = 0 ≠ 1, así que también entra. La demostración de Peterson usa que flag[i] = T ocurre ANTES que turn = j: al invertirlas, el último en escribir turn puede no haber levantado aún su flag.',
	},
	{
		id: 'hyman',
		name: 'Algoritmo A del E1 2026-1 (Hyman)',
		fuente: 'E1 2026-1, Pregunta 2',
		lines: ['// sección no crítica', 'f[i] ← V;', 'mientras (turno ≠ i) hacer:', '    mientras (f[j]) hacer omitir;', '    turno ← i;', '/* SECCIÓN CRÍTICA */', 'f[i] ← F;'],
		ncs: 0,
		cs: 5,
		init: () => ({ f: [false, false], turno: 0 }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'f')[i] = true; return 2;
				case 2: return s.v.turno !== i ? 3 : 5;
				case 3: return arr(s.v, 'f')[j] ? 3 : 4;
				case 4: n.v.turno = i; return 2;
				case 5: return 6;
				default: arr(n.v, 'f')[i] = false; return 0;
			}
		}),
		nota: 'NO garantiza exclusión mutua: P1 pasa el while interno (f[0] = F), se detiene antes de «turno ← 1»; P0 entra porque turno = 0; luego P1 escribe turno = 1 y también entra. Pulsa «Buscar contraejemplo».',
	},
	{
		id: 'flaky',
		name: 'Flaky lock (E1 2024-I)',
		fuente: 'E1 2024-I, Pregunta 2',
		lines: ['// sección no crítica', 'do { do { turn = me;', '     } while (busy);', '     busy = true;', '} while (turn != me);', '/* SECCIÓN CRÍTICA */', 'busy = false;'],
		ncs: 0,
		cs: 5,
		init: () => ({ turn: 0, busy: false }),
		step: mk((s, i, _j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: n.v.turn = i; return 2;
				case 2: return s.v.busy ? 1 : 3;
				case 3: n.v.busy = true; return 4;
				case 4: return s.v.turn !== i ? 1 : 5;
				case 5: return 6;
				default: n.v.busy = false; return 0;
			}
		}),
		nota: 'Cumple exclusión mutua pero puede hacer DEADLOCK: A pone busy = true, B escribe turn = B; A ve turn ≠ A y vuelve al bucle interno, donde queda girando porque busy = true. Nadie libera busy. Como hay deadlock, tampoco es libre de starvation.',
	},
	{
		id: 'flags-first',
		name: 'Intento 3 de Dekker: flag primero, luego espera',
		fuente: 'Stallings cap. 5 / lab2',
		lines: ['// sección no crítica', 'flag[i] ← true;', 'while (flag[j]) ;', '/* SECCIÓN CRÍTICA */', 'flag[i] ← false;'],
		ncs: 0,
		cs: 3,
		init: () => ({ flag: [false, false] }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: arr(n.v, 'flag')[i] = true; return 2;
				case 2: return arr(s.v, 'flag')[j] ? 2 : 3;
				case 3: return 4;
				default: arr(n.v, 'flag')[i] = false; return 0;
			}
		}),
		nota: 'Garantiza exclusión mutua, pero si ambos levantan su flag antes de revisar el del otro, los dos giran para siempre: deadlock.',
	},
	{
		id: 'check-then-set',
		name: 'Intento 2 de Dekker: espera, luego flag',
		fuente: 'Stallings cap. 5 / lab2',
		lines: ['// sección no crítica', 'while (flag[j]) ;', 'flag[i] ← true;', '/* SECCIÓN CRÍTICA */', 'flag[i] ← false;'],
		ncs: 0,
		cs: 3,
		init: () => ({ flag: [false, false] }),
		step: mk((s, i, j, n) => {
			switch (s.pc[i]) {
				case 0: return 1;
				case 1: return arr(s.v, 'flag')[j] ? 1 : 2;
				case 2: arr(n.v, 'flag')[i] = true; return 3;
				case 3: return 4;
				default: arr(n.v, 'flag')[i] = false; return 0;
			}
		}),
		nota: 'Viola exclusión mutua: ambos leen flag del otro en false antes de que alguno lo levante (ventana entre la lectura y la escritura).',
	},
];

const key = (s: State) => JSON.stringify(s);
/** En la sección de entrada: ya pidió entrar pero aún no llega a la SC (las líneas de salida no cuentan). */
const enEntrada = (a: Algo, pc: number) => pc !== a.ncs && pc < a.cs;

/** Progreso: si p quiere entrar y el otro está en su sección no crítica, ¿p llega solo a la SC? */
function soloReaches(a: Algo, s0: State, p: 0 | 1): boolean {
	let s = s0;
	const seen = new Set<string>();
	for (let k = 0; k < 400; k++) {
		if (s.pc[p] === a.cs) return true;
		const kk = key(s);
		if (seen.has(kk)) return false;
		seen.add(kk);
		s = a.step(s, p);
	}
	return false;
}
function progressViolation(a: Algo, s: State): boolean {
	for (const p of [0, 1] as const) {
		const q = (1 - p) as 0 | 1;
		if (s.pc[q] === a.ncs && s.pc[p] !== a.ncs && s.pc[p] !== a.cs && !soloReaches(a, s, p)) return true;
	}
	return false;
}


/** Starvation bajo planificación justa: SCC donde P_p siempre quiere entrar, nunca está en la SC,
 *  y ambos procesos dan pasos dentro del ciclo. Devuelve el camino hasta el ciclo. */
function starvation(a: Algo): { p: 0 | 1; path: (0 | 1)[]; size: number } | null {
	const start: State = { pc: [a.ncs, a.ncs], v: a.init() };
	const idx = new Map<string, number>();
	const states: State[] = [];
	const prev: { from: number; by: 0 | 1 }[] = [];
	const adj: { to: number; by: 0 | 1 }[][] = [];
	const add = (s: State, from: number, by: 0 | 1) => {
		const k = key(s);
		if (idx.has(k)) return idx.get(k)!;
		const id = states.length;
		idx.set(k, id);
		states.push(s);
		prev.push({ from, by });
		adj.push([]);
		return id;
	};
	add(start, -1, 0);
	for (let q = 0; q < states.length && states.length < 60000; q++) {
		for (const p of [0, 1] as const) {
			const to = add(a.step(states[q], p), q, p);
			adj[q].push({ to, by: p });
		}
	}
	// Tarjan iterativo sobre el subgrafo de estados permitidos
	const sccs = (allowed: (v: number) => boolean) => {
		const n = states.length;
		const index = new Array(n).fill(-1), low = new Array(n).fill(0), comp = new Array(n).fill(-1), onStack = new Array(n).fill(false);
		const stack: number[] = [];
		let counter = 0, nc = 0;
		for (let r = 0; r < n; r++) {
			if (index[r] !== -1 || !allowed(r)) continue;
			const work: [number, number][] = [[r, 0]];
			while (work.length) {
				const top = work[work.length - 1];
				const v = top[0];
				if (top[1] === 0 && index[v] === -1) { index[v] = low[v] = counter++; stack.push(v); onStack[v] = true; }
				if (top[1] < adj[v].length) {
					const w = adj[v][top[1]++].to;
					if (!allowed(w)) continue;
					if (index[w] === -1) work.push([w, 0]);
					else if (onStack[w]) low[v] = Math.min(low[v], index[w]);
				} else {
					work.pop();
					if (work.length) { const u = work[work.length - 1][0]; low[u] = Math.min(low[u], low[v]); }
					if (low[v] === index[v]) { let w; do { w = stack.pop()!; onStack[w] = false; comp[w] = nc; } while (w !== v); nc++; }
				}
			}
		}
		return comp;
	};
	for (const p of [0, 1] as const) {
		const q = (1 - p) as 0 | 1;
		const allowed = (v: number) => enEntrada(a, states[v].pc[p]);
		const comp = sccs(allowed);
		const info = new Map<number, { vs: number[]; byP: boolean; byQ: boolean; qCS: boolean }>();
		for (let v = 0; v < states.length; v++) {
			if (comp[v] < 0) continue;
			if (!info.has(comp[v])) info.set(comp[v], { vs: [], byP: false, byQ: false, qCS: false });
			const I = info.get(comp[v])!;
			I.vs.push(v);
			for (const e of adj[v]) if (comp[e.to] === comp[v]) {
				if (e.by === p) I.byP = true;
				else { I.byQ = true; if (states[e.to].pc[q] === a.cs) I.qCS = true; }
			}
		}
		for (const I of info.values()) {
			if (I.byP && I.byQ && I.qCS) {
				const path: (0 | 1)[] = [];
				let cur = I.vs[0];
				while (prev[cur].from !== -1) { path.unshift(prev[cur].by); cur = prev[cur].from; }
				return { p, path, size: I.vs.length };
			}
		}
	}
	return null;
}

/** BFS: busca el camino más corto a una violación de mutex o a un deadlock. */
function search(a: Algo): { path: (0 | 1)[]; kind: 'mutex' | 'deadlock' | 'progreso' } | null {
	const start: State = { pc: [a.ncs, a.ncs], v: a.init() };
	const seen = new Map<string, { prev: string | null; by: 0 | 1 | null }>();
	const q: State[] = [start];
	seen.set(key(start), { prev: null, by: null });
	const states = new Map<string, State>([[key(start), start]]);
	const rebuild = (k: string) => {
		const path: (0 | 1)[] = [];
		let cur: string | null = k;
		while (cur) {
			const info = seen.get(cur)!;
			if (info.by !== null) path.unshift(info.by);
			cur = info.prev;
		}
		return path;
	};
	// deadlock = ambos están en su sección de entrada y ningún estado alcanzable tiene a alguien en CS
	const canReachCS = (s0: State) => {
		const q2 = [s0];
		const vis = new Set([key(s0)]);
		while (q2.length) {
			const s = q2.shift()!;
			if (s.pc[0] === a.cs || s.pc[1] === a.cs) return true;
			for (const p of [0, 1] as const) {
				if (s.pc[p] === a.ncs) continue;
				const n = a.step(s, p);
				const k = key(n);
				if (!vis.has(k)) {
					vis.add(k);
					q2.push(n);
				}
			}
			if (vis.size > 4000) return true;
		}
		return false;
	};
	while (q.length) {
		const s = q.shift()!;
		const k = key(s);
		if (s.pc[0] === a.cs && s.pc[1] === a.cs) return { path: rebuild(k), kind: 'mutex' };
		if (enEntrada(a, s.pc[0]) && enEntrada(a, s.pc[1]) && !canReachCS(s)) return { path: rebuild(k), kind: 'deadlock' };
		if (progressViolation(a, s)) return { path: rebuild(k), kind: 'progreso' };
		for (const p of [0, 1] as const) {
			const n = a.step(s, p);
			const nk = key(n);
			if (!seen.has(nk)) {
				seen.set(nk, { prev: k, by: p });
				states.set(nk, n);
				q.push(n);
			}
		}
		if (seen.size > 20000) break;
	}
	return null;
}

const fmt = (x: unknown): string => (Array.isArray(x) ? `[${x.map(fmt).join(', ')}]` : x === true ? 'V' : x === false ? 'F' : String(x));
const COL = ['var(--sl-color-accent)', 'var(--pg-violet)'];

export default function MutexStepper({ algo: initial = 'peterson', only }: { algo?: string; only?: string[] }) {
	const list = only ? ALGOS.filter((a) => only.includes(a.id)) : ALGOS;
	const [aid, setAid] = useState(initial);
	const a = list.find((x) => x.id === aid) ?? list[0];
	const fresh = (): State => ({ pc: [a.ncs, a.ncs], v: a.init() });
	const [hist, setHist] = useState<{ s: State; by: 0 | 1 | null; line: number | null }[]>([{ s: fresh(), by: null, line: null }]);
	const [found, setFound] = useState<string | null>(null);
	const cur = hist[hist.length - 1].s;

	const deadlockNow = useMemo(() => {
		if (cur.pc[0] === a.ncs || cur.pc[1] === a.ncs) return false;
		const vis = new Set<string>();
		const q = [cur];
		while (q.length) {
			const s = q.shift()!;
			if (s.pc.includes(a.cs)) return false;
			for (const p of [0, 1] as const) {
				if (s.pc[p] === a.ncs) continue;
				const n = a.step(s, p);
				const k = key(n);
				if (!vis.has(k)) {
					vis.add(k);
					q.push(n);
				}
			}
			if (vis.size > 4000) return false;
		}
		return true;
	}, [cur, a]);

	const both = cur.pc[0] === a.cs && cur.pc[1] === a.cs;
	const progressNow = useMemo(() => progressViolation(a, cur), [a, cur]);
	const step = (p: 0 | 1) => setHist((h) => [...h, { s: a.step(h[h.length - 1].s, p), by: p, line: h[h.length - 1].s.pc[p] }]);
	const reset = (id = aid) => {
		const al = list.find((x) => x.id === id) ?? list[0];
		setHist([{ s: { pc: [al.ncs, al.ncs], v: al.init() }, by: null, line: null }]);
		setFound(null);
	};
	const replay = () => {
		const r = search(a);
		if (!r) {
			setFound('No existe ninguna intercalación que viole la exclusión mutua, lleve a deadlock o bloquee el progreso (búsqueda exhaustiva del espacio de estados). Ojo: la starvation no se verifica aquí.');
			return;
		}
		let s = fresh();
		const h: typeof hist = [{ s, by: null, line: null }];
		for (const p of r.path) {
			const line = s.pc[p];
			s = a.step(s, p);
			h.push({ s, by: p, line });
		}
		setHist(h);
		setFound(
			r.kind === 'mutex'
				? `Contraejemplo de ${r.path.length} pasos: ambos procesos terminan en la sección crítica.`
				: r.kind === 'deadlock'
					? `Traza de ${r.path.length} pasos que termina en deadlock: ninguno puede volver a entrar.`
					: `Traza de ${r.path.length} pasos que viola el PROGRESO: un proceso quiere entrar, el otro está en su sección no crítica, y aun así el primero no puede entrar nunca por sí solo.`,
		);
	};

	const replayStarv = () => {
		const r = starvation(a);
		if (!r) {
			setFound('Sin bypass indefinido: en todo el grafo de estados no hay ningún ciclo en que un proceso quiera entrar para siempre mientras el otro sigue entrando a la SC (planificador justo). Ojo: si el algoritmo tiene deadlock o viola el progreso, TAMPOCO es starvation-free. Combínalo con el otro buscador.');
			return;
		}
		let s = fresh();
		const h: typeof hist = [{ s, by: null, line: null }];
		for (const p of r.path) {
			const line = s.pc[p];
			s = a.step(s, p);
			h.push({ s, by: p, line });
		}
		setHist(h);
		setFound(`STARVATION posible para P${r.p}: desde este estado (${r.path.length} pasos) hay un ciclo de ${r.size} estados en que P${r.p} quiere entrar y nunca entra, mientras P${1 - r.p} sigue entrando a la SC. Continúa la traza a mano para recorrer el ciclo.`);
	};

	return (
		<div className="pg not-content">
			<h4>Intercalador de algoritmos de exclusión mutua</h4>
			<p className="pg-sub">Tú eres el planificador: cada clic ejecuta <b>una línea</b> de P0 o P1. Las escrituras y lecturas son atómicas, como en los exámenes.</p>
			{list.length > 1 && (
				<div className="pg-seg">
					{list.map((x) => (
						<button key={x.id} className={x.id === a.id ? 'active' : ''} onClick={() => { setAid(x.id); reset(x.id); }}>
							{x.name}
						</button>
					))}
				</div>
			)}
			<div className="pg-grid-2">
				<div>
					<span className="lane-label">Código de P<sub>i</sub> (j = el otro) · {a.fuente}</span>
					<pre className="pg-code">
						{a.lines.map((l, n) => (
							<div key={n} className={`ln ${cur.pc.includes(n) ? 'hl' : ''}`} style={n === a.cs ? { color: 'var(--pg-ok)' } : undefined}>
								<span className="num">{n}</span>
								<span>{l}</span>
								<span className="badges">
									{[0, 1].map((p) =>
										cur.pc[p] === n ? (
											<motion.span layoutId={`b${p}`} key={p} className="badge" style={{ background: COL[p] }} transition={{ type: 'spring', stiffness: 500, damping: 34 }}>
												P{p}
											</motion.span>
										) : null,
									)}
								</span>
							</div>
						))}
					</pre>
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
					<div className="pg-stats">
						{Object.entries(cur.v).map(([k, v]) => (
							<div className="pg-stat" key={k}>
								<span className="k mono">{k}</span>
								<motion.span className="v mono" key={fmt(v)} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
									{fmt(v)}
								</motion.span>
							</div>
						))}
					</div>
					<div className="pg-row">
						<button className="primary" onClick={() => step(0)} style={{ background: COL[0] }}>Paso P0</button>
						<button className="primary" onClick={() => step(1)} style={{ background: COL[1] }}>Paso P1</button>
						<button onClick={() => step(Math.random() < 0.5 ? 0 : 1)}>Aleatorio</button>
						<button onClick={() => hist.length > 1 && setHist((h) => h.slice(0, -1))} disabled={hist.length < 2}>Deshacer</button>
						<button onClick={() => reset()}>Reiniciar</button>
					</div>
					<div className="pg-row">
						<button onClick={replay} style={{ borderColor: 'var(--pg-warn)' }}>🔎 Buscar contraejemplo (BFS)</button>
						<button onClick={replayStarv} style={{ borderColor: 'var(--pg-violet)' }}>⏳ ¿Starvation?</button>
					</div>
					<AnimatePresence mode="popLayout">
						{both && (
							<motion.div key="mx" className="pg-note bad" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
								💥 <b>Violación de exclusión mutua:</b> P0 y P1 están a la vez en la sección crítica.
							</motion.div>
						)}
						{!both && !deadlockNow && progressNow && (
							<motion.div key="pr" className="pg-note bad" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
								⛔ <b>Violación de progreso:</b> el otro proceso está en su sección no crítica, y aun así quien quiere entrar no puede avanzar por sí solo.
							</motion.div>
						)}
						{!both && deadlockNow && (
							<motion.div key="dl" className="pg-note bad" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
								🔒 <b>Deadlock:</b> ambos quieren entrar y ninguna intercalación futura permite que alguno llegue a la sección crítica.
							</motion.div>
						)}
						{found && (
							<motion.div key="f" className="pg-note warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
								{found}
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</div>
			<div>
				<span className="lane-label">Traza ({hist.length - 1} pasos)</span>
				<div className="lane" style={{ maxHeight: '7.5rem', overflowY: 'auto' }}>
					{hist.slice(1).map((h, k) => (
						<motion.span key={k} className="sim-proc" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} style={{ borderColor: COL[h.by!] }}>
							{k + 1}. P{h.by}:{h.line}
						</motion.span>
					))}
					{hist.length === 1 && <span style={{ color: 'var(--pg-muted)', fontSize: '0.8rem' }}>Todavía no hay pasos.</span>}
				</div>
			</div>
			<div className="pg-note">{a.nota}</div>
		</div>
	);
}
