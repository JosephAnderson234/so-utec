import { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type Seg = { size: number; used: string | null };
// Mapa inicial inspirado en la figura 7.5 de Stallings (bloques libres de 8, 12, 22, 18, 8, 6, 14 y 36 MB)
const INIT: Seg[] = [
	{ size: 8, used: 'OS' },
	{ size: 8, used: null },
	{ size: 6, used: 'P1' },
	{ size: 12, used: null },
	{ size: 4, used: 'P2' },
	{ size: 22, used: null },
	{ size: 2, used: 'P3' },
	{ size: 18, used: null },
	{ size: 4, used: 'P4' },
	{ size: 8, used: null },
	{ size: 6, used: 'P5' },
	{ size: 6, used: null },
	{ size: 4, used: 'P6' },
	{ size: 14, used: null },
	{ size: 10, used: 'P7' },
	{ size: 36, used: null },
];
type Algo = 'first' | 'best' | 'next' | 'worst';
const NAMES: Record<Algo, string> = { first: 'First-fit', best: 'Best-fit', next: 'Next-fit', worst: 'Worst-fit' };
const COL: Record<Algo, string> = { first: 'var(--pg-c1)', best: 'var(--pg-ok)', next: 'var(--pg-violet)', worst: 'var(--pg-c5)' };

function choose(mem: Seg[], req: number, algo: Algo, last: number): number {
	const fits = mem.map((s, i) => (!s.used && s.size >= req ? i : -1)).filter((i) => i >= 0);
	if (!fits.length) return -1;
	if (algo === 'first') return fits[0];
	if (algo === 'best') return fits.reduce((a, b) => (mem[b].size < mem[a].size ? b : a));
	if (algo === 'worst') return fits.reduce((a, b) => (mem[b].size > mem[a].size ? b : a));
	const after = fits.find((i) => i > last);
	return after ?? fits[0];
}

export default function PlacementSim() {
	const [mem, setMem] = useState<Seg[]>(INIT);
	const [last, setLast] = useState(6); // índice de la última asignación (P3)
	const [req, setReq] = useState(16);
	const [count, setCount] = useState(8);
	const picks = useMemo(() => (Object.keys(NAMES) as Algo[]).map((a) => ({ a, i: choose(mem, req, a, last) })), [mem, req, last]);
	const total = mem.reduce((a, s) => a + s.size, 0);
	const free = mem.filter((s) => !s.used);
	const freeSum = free.reduce((a, s) => a + s.size, 0);
	const maxHole = Math.max(0, ...free.map((s) => s.size));

	const alloc = (a: Algo) => {
		const i = choose(mem, req, a, last);
		if (i < 0) return;
		const s = mem[i];
		const name = `P${count}`;
		const next: Seg[] = [...mem.slice(0, i), { size: req, used: name }, ...(s.size > req ? [{ size: s.size - req, used: null }] : []), ...mem.slice(i + 1)];
		setMem(next);
		setLast(i);
		setCount((c) => c + 1);
	};
	const release = (i: number) => {
		const m = mem.map((s) => ({ ...s }));
		m[i].used = null;
		const merged: Seg[] = [];
		for (const s of m) {
			const prev = merged[merged.length - 1];
			if (prev && !prev.used && !s.used) prev.size += s.size;
			else merged.push(s);
		}
		setMem(merged);
		setLast((l) => Math.min(l, merged.length - 1));
	};

	return (
		<div className="pg not-content">
			<h4>Algoritmos de placement (particiones dinámicas)</h4>
			<p className="pg-sub">Cada marcador muestra el hueco que elegiría cada algoritmo. Asigna varias veces y mira cómo crece la fragmentación externa. Haz clic en un proceso para liberarlo; los huecos adyacentes se combinan.</p>
			<label className="pg-field" style={{ maxWidth: '22rem' }}>
				<span>Solicitud: <b>{req} MB</b></span>
				<input type="range" min={1} max={40} value={req} onChange={(e) => setReq(+e.target.value)} />
			</label>
			<div style={{ position: 'relative', paddingTop: '1.6rem' }}>
				<div className="membar">
					{mem.map((s, i) => (
						<motion.div
							key={i + ':' + s.size + (s.used ?? '')}
							layout
							className={s.used ? '' : 'free'}
							onClick={() => s.used && s.used !== 'OS' && release(i)}
							style={{ flex: `${s.size} 1 0`, background: s.used ? (s.used === 'OS' ? 'var(--pg-surface-2)' : 'var(--pg-c2)') : undefined, cursor: s.used && s.used !== 'OS' ? 'pointer' : 'default', color: s.used === 'OS' ? 'var(--pg-muted)' : undefined, flexDirection: 'column', lineHeight: 1.15, position: 'relative' }}
						>
							<span>{s.used ?? ''}</span>
							<span>{s.size}</span>
						</motion.div>
					))}
				</div>
				{picks.map(({ a, i }, k) =>
					i >= 0 ? (
						<motion.span
							key={a}
							className="badge"
							layout
							style={{ position: 'absolute', top: k % 2 ? '0.75rem' : 0, left: `${(100 * mem.slice(0, i).reduce((x, s) => x + s.size, 0)) / total}%`, background: COL[a] }}
						>
							{NAMES[a]}
						</motion.span>
					) : null,
				)}
			</div>
			<div className="pg-row">
				{(Object.keys(NAMES) as Algo[]).map((a) => (
					<button key={a} onClick={() => alloc(a)} disabled={choose(mem, req, a, last) < 0} style={{ borderColor: COL[a] }}>
						Asignar con {NAMES[a]}
					</button>
				))}
				<button onClick={() => { setMem(INIT); setLast(6); setCount(8); }}>Reiniciar</button>
			</div>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Memoria libre total</span><span className="v">{freeSum} MB</span></div>
				<div className="pg-stat"><span className="k">Hueco más grande</span><span className="v">{maxHole} MB</span></div>
				<div className="pg-stat"><span className="k">Huecos</span><span className="v">{free.length}</span></div>
			</div>
			{req > maxHole && req <= freeSum && (
				<div className="pg-note bad">
					<b>Fragmentación externa:</b> hay {freeSum} MB libres en total, pero ningún hueco contiguo de {req} MB. La solución es compactar, y eso requiere relocalización dinámica.
				</div>
			)}
		</div>
	);
}
