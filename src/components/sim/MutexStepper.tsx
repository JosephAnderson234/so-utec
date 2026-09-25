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

/** BFS: busca el camino más corto a una violación de mutex o a un deadlock. */
function search(a: Algo): { path: (0 | 1)[]; kind: 'mutex' | 'deadlock' } | null {
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
	// deadlock = ambos quieren entrar y ningún estado alcanzable tiene a alguien en CS
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
		if (s.pc[0] !== a.ncs && s.pc[1] !== a.ncs && !canReachCS(s)) return { path: rebuild(k), kind: 'deadlock' };
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
	const step = (p: 0 | 1) => setHist((h) => [...h, { s: a.step(h[h.length - 1].s, p), by: p, line: h[h.length - 1].s.pc[p] }]);
	const reset = (id = aid) => {
		const al = list.find((x) => x.id === id) ?? list[0];
		setHist([{ s: { pc: [al.ncs, al.ncs], v: al.init() }, by: null, line: null }]);
		setFound(null);
	};
	const replay = () => {
		const r = search(a);
		if (!r) {
			setFound('No existe ninguna intercalación que viole la exclusión mutua ni que lleve a deadlock (búsqueda exhaustiva del espacio de estados).');
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
		setFound(r.kind === 'mutex' ? `Contraejemplo de ${r.path.length} pasos: ambos procesos terminan en la sección crítica.` : `Traza de ${r.path.length} pasos que termina en deadlock: ninguno puede volver a entrar.`);
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
					<button onClick={replay} style={{ borderColor: 'var(--pg-warn)' }}>🔎 Buscar contraejemplo (BFS)</button>
					<AnimatePresence mode="popLayout">
						{both && (
							<motion.div key="mx" className="pg-note bad" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}>
								💥 <b>Violación de exclusión mutua:</b> P0 y P1 están a la vez en la sección crítica.
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
