import { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type Algo = 'FIFO' | 'OPT' | 'LRU' | 'Clock';
type Step = { ref: string; frames: (string | null)[]; use: number[]; ptr: number; hit: boolean; slot: number; why: string };

const ALGOS: Algo[] = ['FIFO', 'OPT', 'LRU', 'Clock'];

function simulate(refs: string[], n: number, algo: Algo): Step[] {
	const frames: (string | null)[] = Array(n).fill(null);
	const use = Array(n).fill(0);
	const loaded: number[] = Array(n).fill(-1);
	const last: Record<string, number> = {};
	let ptr = 0;
	const out: Step[] = [];
	refs.forEach((r, k) => {
		let hit = frames.includes(r);
		let slot = frames.indexOf(r);
		let why = '';
		if (hit) {
			why = `${r} ya está en el frame ${slot}: acierto.`;
			if (algo === 'Clock') {
				use[slot] = 1;
				why += ' Se pone su bit de uso en 1.';
			}
		} else if (frames.includes(null)) {
			slot = frames.indexOf(null);
			frames[slot] = r;
			loaded[slot] = k;
			use[slot] = 1;
			if (algo === 'Clock') ptr = (slot + 1) % n;
			why = `Fallo: hay un frame libre (${slot}), ${r} entra sin expulsar a nadie.`;
		} else {
			if (algo === 'FIFO') {
				slot = loaded.indexOf(Math.min(...loaded));
				why = `Fallo: FIFO expulsa la página que lleva más tiempo cargada, ${frames[slot]}.`;
			} else if (algo === 'LRU') {
				slot = frames.reduce((b, p, j) => (last[p!] < last[frames[b]!] ? j : b), 0);
				why = `Fallo: LRU expulsa la usada hace más tiempo, ${frames[slot]} (último uso en el paso ${last[frames[slot]!] + 1}).`;
			} else if (algo === 'OPT') {
				const fut = refs.slice(k + 1);
				const dist = (p: string) => (fut.includes(p) ? fut.indexOf(p) : Infinity);
				slot = frames.reduce((b, p, j) => (dist(p!) > dist(frames[b]!) ? j : b), 0);
				const d = dist(frames[slot]!);
				why = `Fallo: OPT expulsa la que se usará más tarde, ${frames[slot]} (${d === Infinity ? 'no se vuelve a usar' : `se usa dentro de ${d + 1} referencias`}).`;
			} else {
				const cleared: string[] = [];
				while (use[ptr] === 1) {
					use[ptr] = 0;
					cleared.push(frames[ptr]!);
					ptr = (ptr + 1) % n;
				}
				slot = ptr;
				why = `Fallo: el puntero ${cleared.length ? `apaga el bit de ${cleared.join(', ')} y ` : ''}encuentra ${frames[slot]} con uso = 0: la expulsa.`;
				ptr = (slot + 1) % n;
			}
			frames[slot] = r;
			loaded[slot] = k;
			use[slot] = 1;
		}
		last[r] = k;
		out.push({ ref: r, frames: [...frames], use: [...use], ptr, hit, slot, why });
	});
	return out;
}

const PRESETS = [
	{ id: 'p1', label: 'Ejercicio P1 (3 frames)', refs: 'A B D C B E D B D B A C B C A C', n: 3, algo: 'FIFO' as Algo },
	{ id: 'belady', label: 'Belady (P2)', refs: 'A B C D A B E A B C D E', n: 3, algo: 'FIFO' as Algo },
	{ id: 'p4', label: 'Ejercicio P4 (Clock, 4 frames)', refs: 'A B C A C D B D A E B F', n: 4, algo: 'Clock' as Algo },
	{ id: 'stallings', label: 'Stallings fig. 8.14', refs: '2 3 2 1 5 2 4 5 3 2 5 2', n: 3, algo: 'LRU' as Algo },
	{ id: 'lab4', label: 'Hoja sem 11 · ej 1', refs: 'A B C A D B E A C D B E', n: 3, algo: 'Clock' as Algo },
	{ id: 'lab4rr', label: 'Ej 2 (RR + FIFO)', refs: 'A B D E A C D F', n: 3, algo: 'FIFO' as Algo },
	{ id: 'lab4prio', label: 'Ej 3 (prioridad + LRU)', refs: 'C D C A B A E A E', n: 3, algo: 'LRU' as Algo },
];

/** Simulador de reemplazo de páginas: FIFO, OPT, LRU y Clock, paso a paso y con la curva fallos vs frames. */
export default function PageReplacement({ preset = 'p1' }: { preset?: string }) {
	const p0 = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];
	const [text, setText] = useState(p0.refs);
	const [n, setN] = useState(p0.n);
	const [algo, setAlgo] = useState<Algo>(p0.algo);
	const [k, setK] = useState(Infinity);
	const refs = useMemo(() => text.trim().split(/[\s,]+/).filter(Boolean).slice(0, 40), [text]);
	const steps = useMemo(() => simulate(refs, n, algo), [refs, n, algo]);
	const shown = Math.min(k, steps.length);
	const faults = steps.slice(0, shown).filter((s) => !s.hit).length;
	const curve = useMemo(
		() => ALGOS.map((a) => ({ a, v: Array.from({ length: 7 }, (_, i) => simulate(refs, i + 1, a).filter((s) => !s.hit).length) })),
		[refs],
	);
	const max = Math.max(1, ...curve.flatMap((c) => c.v));
	const colors: Record<Algo, string> = { FIFO: 'var(--pg-bad)', OPT: 'var(--pg-ok)', LRU: 'var(--pg-violet)', Clock: 'var(--sl-color-accent)' };
	const belady = curve.flatMap((c) => c.v.slice(1).map((v, i) => (v > c.v[i] ? `${c.a}: ${i + 1} → ${i + 2} frames (${c.v[i]} → ${v} fallos)` : null)).filter(Boolean));
	const load = (p: (typeof PRESETS)[number]) => {
		setText(p.refs);
		setN(p.n);
		setAlgo(p.algo);
		setK(Infinity);
	};
	const cur = shown > 0 ? steps[shown - 1] : null;

	return (
		<div className="pg not-content">
			<h4>Reemplazo de páginas paso a paso</h4>
			<p className="pg-sub">Escribe la cadena de referencias, elige cuántos frames hay y el algoritmo. «F» marca un fallo de página; en Clock, el <b>*</b> es el bit de uso y ▸ es la posición del puntero.</p>
			<div className="pg-seg">
				{PRESETS.map((p) => (
					<button key={p.id} onClick={() => load(p)}>{p.label}</button>
				))}
			</div>
			<div className="pg-row">
				<label className="pg-field" style={{ flex: '1 1 18rem' }}>
					<span>Referencias</span>
					<input type="text" value={text} onChange={(e) => { setText(e.target.value); setK(Infinity); }} />
				</label>
				<label className="pg-field">
					<span>Frames: <b>{n}</b></span>
					<input type="range" min={1} max={7} value={n} onChange={(e) => { setN(+e.target.value); setK(Infinity); }} />
				</label>
			</div>
			<div className="pg-seg">
				{ALGOS.map((a) => (
					<button key={a} className={a === algo ? 'active' : ''} onClick={() => { setAlgo(a); setK(Infinity); }}>{a}</button>
				))}
			</div>
			<div className="pg-seg">
				<button onClick={() => setK(0)}>⟲ Inicio</button>
				<button onClick={() => setK(Math.max(0, shown - 1))} disabled={shown === 0}>◀ Paso</button>
				<button className="primary" onClick={() => setK(Math.min(steps.length, shown + 1))} disabled={shown >= steps.length}>Paso ▶</button>
				<button onClick={() => setK(Infinity)}>Todo ⏭</button>
			</div>
			<div className="pg-scroll">
				<table style={{ textAlign: 'center', fontFamily: 'var(--__sl-font-mono)', fontSize: '0.78rem' }}>
					<thead>
						<tr>
							<th>ref</th>
							{steps.map((s, i) => (
								<th key={i} style={{ opacity: i < shown ? 1 : 0.35 }}>{s.ref}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{Array.from({ length: n }, (_, f) => (
							<tr key={f}>
								<td>f{f}</td>
								{steps.map((s, i) => {
									const vis = i < shown;
									const changed = vis && !s.hit && s.slot === f;
									const hitCell = vis && s.hit && s.slot === f;
									const ptrHere = algo === 'Clock' && vis && s.ptr === f;
									return (
										<td key={i} style={{ background: changed ? 'color-mix(in srgb, var(--pg-bad) 22%, transparent)' : hitCell ? 'color-mix(in srgb, var(--pg-ok) 22%, transparent)' : undefined }}>
											{vis ? (
												<motion.span key={`${i}-${s.frames[f]}`} initial={changed ? { scale: 0.4, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }}>
													{ptrHere ? '▸' : ''}
													{s.frames[f] ?? '·'}
													{algo === 'Clock' && s.frames[f] ? (s.use[f] ? '*' : '') : ''}
												</motion.span>
											) : ''}
										</td>
									);
								})}
							</tr>
						))}
						<tr>
							<td>fallo</td>
							{steps.map((s, i) => (
								<td key={i} style={{ color: 'var(--pg-bad)', fontWeight: 700 }}>{i < shown && !s.hit ? 'F' : ''}</td>
							))}
						</tr>
					</tbody>
				</table>
			</div>
			{cur && <div className="pg-note">Paso {shown}: {cur.why}</div>}
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Fallos</span><span className="v">{faults}</span></div>
				<div className="pg-stat"><span className="k">Aciertos</span><span className="v">{shown - faults}</span></div>
				<div className="pg-stat"><span className="k">Tasa de fallos</span><span className="v">{shown ? ((100 * faults) / shown).toFixed(0) : 0} %</span></div>
			</div>
			<h4 style={{ marginTop: '1rem' }}>Fallos según el número de frames</h4>
			<div className="pg-scroll">
				<table style={{ textAlign: 'center', fontSize: '0.8rem' }}>
					<thead>
						<tr><th>algoritmo</th>{Array.from({ length: 7 }, (_, i) => <th key={i}>{i + 1} fr</th>)}</tr>
					</thead>
					<tbody>
						{curve.map((c) => (
							<tr key={c.a}>
								<td style={{ color: colors[c.a], fontWeight: 700 }}>{c.a}</td>
								{c.v.map((v, i) => (
									<td key={i} style={{ fontWeight: i + 1 === n ? 700 : 400, background: i > 0 && v > c.v[i - 1] ? 'color-mix(in srgb, var(--pg-bad) 25%, transparent)' : undefined }}>
										<div style={{ height: 4, borderRadius: 2, background: colors[c.a], width: `${(100 * v) / max}%`, margin: '0 auto 2px' }} />
										{v}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</div>
			{belady.length > 0 ? (
				<div className="pg-note bad">⚠ <b>Anomalía de Belady</b>: con más frames hay más fallos en {belady.join('; ')}. LRU y OPT nunca la tienen (son algoritmos «de pila»).</div>
			) : (
				<div className="pg-note ok">Con esta cadena ningún algoritmo empeora al agregar frames.</div>
			)}
		</div>
	);
}
