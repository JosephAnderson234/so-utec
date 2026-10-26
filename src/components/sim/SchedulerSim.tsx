import { useMemo, useState } from 'react';

type Algo = 'FCFS' | 'SJF' | 'SRTF' | 'PRIO' | 'PRIOP' | 'RR' | 'HRRN';
type Proc = { n: string; a: number; b: number; p: number; i: number };
type Slice = { n: string; s: number; e: number };
type Res = { gantt: Slice[]; fin: Record<string, number>; first: Record<string, number>; log: string[] };

const ALGOS: { id: Algo; label: string }[] = [
	{ id: 'FCFS', label: 'FCFS' },
	{ id: 'SJF', label: 'SJF (no expropiativo)' },
	{ id: 'SRTF', label: 'SRTF' },
	{ id: 'PRIO', label: 'Prioridad' },
	{ id: 'PRIOP', label: 'Prioridad expropiativa' },
	{ id: 'RR', label: 'Round Robin' },
	{ id: 'HRRN', label: 'HRRN' },
];

const PRESETS = [
	{ id: 'hoja', label: 'Hoja sem 11 · ej 7', text: 'P1 0 7\nP2 2 3\nP3 4 2\nP4 5 4', algo: 'SJF' as Algo, q: 3 },
	{ id: 'base', label: 'base-scheduler.c', text: 'P1 0 7 3\nP2 2 3 1\nP3 4 2 4\nP4 5 4 2\nP5 8 5 5', algo: 'RR' as Algo, q: 3 },
	{ id: 'ej10', label: 'Ej 10 (RR q=2)', text: 'P1 0 5\nP2 0 2\nP3 0 4', algo: 'RR' as Algo, q: 2 },
	{ id: 'idle', label: 'CPU inactiva', text: 'P1 5 3\nP2 6 2\nP3 12 4', algo: 'FCFS' as Algo, q: 3 },
	{ id: 'stallings', label: 'Stallings tabla 9.4', text: 'A 0 3\nB 2 6\nC 4 4\nD 6 5\nE 8 2', algo: 'HRRN' as Algo, q: 1 },
	{ id: 'srtf', label: 'Diapositiva SRTF', text: 'P1 0 8\nP2 1 4\nP3 2 9\nP4 3 5', algo: 'SRTF' as Algo, q: 4 },
];

function parse(text: string): Proc[] {
	return text
		.split('\n')
		.map((l) => l.trim().split(/[\s,]+/))
		.filter((t) => t.length >= 3 && t[0] && !isNaN(+t[1]) && +t[2] > 0)
		.slice(0, 10)
		.map((t, i) => ({ n: t[0], a: Math.max(0, +t[1]), b: Math.min(60, +t[2]), p: t[3] !== undefined && !isNaN(+t[3]) ? +t[3] : 0, i }));
}

function simulate(ps: Proc[], algo: Algo, q: number, mayorEsMas: boolean): Res {
	const rem: Record<string, number> = Object.fromEntries(ps.map((x) => [x.n, x.b]));
	const fin: Record<string, number> = {};
	const first: Record<string, number> = {};
	const gantt: Slice[] = [];
	const log: string[] = [];
	const prio = (x: Proc) => (mayorEsMas ? -x.p : x.p);
	const tie = (x: Proc, y: Proc) => x.a - y.a || x.i - y.i;
	const pend = () => ps.filter((x) => fin[x.n] === undefined);
	const push = (n: string, s: number, e: number) => {
		const last = gantt[gantt.length - 1];
		if (last && last.n === n && last.e === s && n !== 'IDLE' && algo !== 'RR') last.e = e;
		else gantt.push({ n, s, e });
	};
	let t = 0;
	let guard = 0;

	if (algo === 'RR') {
		const order = [...ps].sort(tie);
		const Q: Proc[] = [];
		let k = 0;
		const admit = (upto: number) => {
			while (k < order.length && order[k].a <= upto) Q.push(order[k++]);
		};
		admit(0);
		while (pend().length && guard++ < 500) {
			if (!Q.length) {
				const nx = order[k].a;
				push('IDLE', t, nx);
				log.push(`t=${t}: no hay nadie listo → IDLE hasta t=${nx}.`);
				t = nx;
				admit(t);
				continue;
			}
			const x = Q.shift()!;
			const s = Math.min(q, rem[x.n]);
			first[x.n] ??= t;
			push(x.n, t, t + s);
			rem[x.n] -= s;
			t += s;
			const antes = k;
			admit(t);
			const llegaron = order.slice(antes, k).map((y) => y.n);
			if (rem[x.n] === 0) {
				fin[x.n] = t;
				log.push(`t=${t - s}–${t}: ${x.n} corre ${s} y termina.${llegaron.length ? ` Llegan ${llegaron.join(', ')} a la cola.` : ''}`);
			} else {
				Q.push(x);
				log.push(`t=${t - s}–${t}: ${x.n} corre ${s}, le quedan ${rem[x.n]}.${llegaron.length ? ` Primero entran ${llegaron.join(', ')} y después` : ''} ${x.n} vuelve al final. Cola: [${Q.map((y) => y.n).join(', ')}]`);
			}
		}
		return { gantt, fin, first, log };
	}

	const preemptive = algo === 'SRTF' || algo === 'PRIOP';
	while (pend().length && guard++ < 2000) {
		const ready = pend().filter((x) => x.a <= t);
		if (!ready.length) {
			const nx = Math.min(...pend().map((x) => x.a));
			push('IDLE', t, nx);
			log.push(`t=${t}: no hay nadie listo → IDLE hasta t=${nx}.`);
			t = nx;
			continue;
		}
		const key = (x: Proc): number => {
			if (algo === 'SJF') return x.b;
			if (algo === 'SRTF') return rem[x.n];
			if (algo === 'PRIO' || algo === 'PRIOP') return prio(x);
			if (algo === 'HRRN') return -(t - x.a + x.b) / x.b;
			return 0;
		};
		const x = [...ready].sort((u, v) => key(u) - key(v) || tie(u, v))[0];
		first[x.n] ??= t;
		if (preemptive) {
			const futuros = pend().filter((y) => y.a > t).map((y) => y.a);
			const e = Math.min(t + rem[x.n], ...futuros);
			const prev = gantt[gantt.length - 1];
			if (!prev || prev.n !== x.n) log.push(`t=${t}: elige ${x.n} (${algo === 'SRTF' ? `restante ${rem[x.n]}` : `prioridad ${x.p}`}) entre [${ready.map((y) => y.n).join(', ')}].`);
			push(x.n, t, e);
			rem[x.n] -= e - t;
			t = e;
			if (rem[x.n] === 0) fin[x.n] = t;
		} else {
			const why =
				algo === 'SJF' ? `ráfaga ${x.b}` : algo === 'PRIO' ? `prioridad ${x.p}` : algo === 'HRRN' ? `R = (${t - x.a} + ${x.b}) / ${x.b} = ${((t - x.a + x.b) / x.b).toFixed(2)}` : `llegó en t=${x.a}`;
			log.push(`t=${t}: listos [${ready.map((y) => y.n).join(', ')}] → elige ${x.n} (${why}) y corre hasta t=${t + rem[x.n]}.`);
			push(x.n, t, t + rem[x.n]);
			t += rem[x.n];
			rem[x.n] = 0;
			fin[x.n] = t;
		}
	}
	return { gantt, fin, first, log };
}

const PALETTE = ['#4f8cff', '#e8833a', '#3fb27f', '#c25bd6', '#e05263', '#2bb3c0', '#b8a02a', '#7a6cf0', '#d0607f', '#5aa05a'];

/** Simulador de planificación de CPU: Gantt, métricas y la explicación de cada decisión. */
export default function SchedulerSim({ preset = 'hoja' }: { preset?: string }) {
	const p0 = PRESETS.find((p) => p.id === preset) ?? PRESETS[0];
	const [text, setText] = useState(p0.text);
	const [algo, setAlgo] = useState<Algo>(p0.algo);
	const [q, setQ] = useState(p0.q);
	const [mayor, setMayor] = useState(true);
	const ps = useMemo(() => parse(text), [text]);
	const res = useMemo(() => (ps.length ? simulate(ps, algo, q, mayor) : null), [ps, algo, q, mayor]);
	const total = res ? Math.max(1, ...res.gantt.map((g) => g.e)) : 1;
	const color = (n: string) => (n === 'IDLE' ? 'transparent' : PALETTE[ps.findIndex((x) => x.n === n) % PALETTE.length]);
	const rows = res
		? ps.map((x) => {
				const tat = res.fin[x.n] - x.a;
				return { ...x, fin: res.fin[x.n], tat, wt: tat - x.b, rt: res.first[x.n] - x.a };
			})
		: [];
	const avg = (k: 'tat' | 'wt' | 'rt') => (rows.length ? (rows.reduce((s, r) => s + r[k], 0) / rows.length).toFixed(2) : '–');
	const usaPrio = algo === 'PRIO' || algo === 'PRIOP';

	return (
		<div className="pg not-content">
			<h4>Planificador paso a paso</h4>
			<p className="pg-sub">
				Una línea por proceso: <code>nombre llegada ráfaga [prioridad]</code>. Desempate: llega primero; si llegan juntos, el que está más arriba en la lista. En Round Robin, los que llegan durante un turno entran a la cola <b>antes</b> que el proceso que acaba de agotar su quantum.
			</p>
			<div className="pg-seg">
				{PRESETS.map((p) => (
					<button key={p.id} onClick={() => { setText(p.text); setAlgo(p.algo); setQ(p.q); }}>{p.label}</button>
				))}
			</div>
			<div className="pg-row">
				<label className="pg-field" style={{ flex: '1 1 14rem' }}>
					<span>Procesos</span>
					<textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} style={{ fontFamily: 'var(--__sl-font-mono)', fontSize: '0.85rem' }} />
				</label>
				<div className="pg-field" style={{ flex: '1 1 12rem' }}>
					{algo === 'RR' && (
						<label className="pg-field">
							<span>Quantum: <b>{q}</b></span>
							<input type="range" min={1} max={10} value={q} onChange={(e) => setQ(+e.target.value)} />
						</label>
					)}
					{usaPrio && (
						<div className="pg-seg">
							<button className={mayor ? 'active' : ''} onClick={() => setMayor(true)}>número mayor = más prioridad</button>
							<button className={!mayor ? 'active' : ''} onClick={() => setMayor(false)}>número menor = más prioridad</button>
						</div>
					)}
				</div>
			</div>
			<div className="pg-seg">
				{ALGOS.map((a) => (
					<button key={a.id} className={a.id === algo ? 'active' : ''} onClick={() => setAlgo(a.id)}>{a.label}</button>
				))}
			</div>
			{res && (
				<>
					<div className="pg-scroll">
						<div style={{ position: 'relative', minWidth: `${Math.min(60, Math.max(20, total)) * 1.4}rem`, height: '2.8rem', margin: '0.6rem 0.8rem 0.2rem' }}>
							{res.gantt.map((g, i) => (
								<div
									key={`${algo}-${i}-${g.n}`}
									title={`${g.n}: ${g.s}–${g.e}`}
									style={{
										position: 'absolute', left: `${(100 * g.s) / total}%`, width: `${(100 * (g.e - g.s)) / total}%`, top: 0, bottom: '1rem',
										background: color(g.n), border: g.n === 'IDLE' ? '1px dashed var(--sl-color-gray-4)' : '1px solid var(--sl-color-bg)',
										color: g.n === 'IDLE' ? 'var(--sl-color-gray-3)' : '#fff', fontSize: '0.75rem', fontWeight: 700,
										display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 3, overflow: 'hidden',
									}}
								>
									{g.n === 'IDLE' ? 'idle' : g.n}
								</div>
							))}
							{[...new Set(res.gantt.flatMap((g) => [g.s, g.e]))].map((x) => (
								<span key={x} style={{ position: 'absolute', left: `${(100 * x) / total}%`, bottom: 0, transform: 'translateX(-50%)', fontSize: '0.7rem', fontFamily: 'var(--__sl-font-mono)' }}>{x}</span>
							))}
						</div>
					</div>
					<div className="pg-scroll">
						<table style={{ textAlign: 'center', fontSize: '0.8rem' }}>
							<thead>
								<tr><th>proceso</th><th>llega</th><th>ráfaga</th>{usaPrio && <th>prio</th>}<th>termina</th><th>turnaround</th><th>espera</th><th>respuesta</th></tr>
							</thead>
							<tbody>
								{rows.map((r) => (
									<tr key={r.n}>
										<td style={{ color: color(r.n), fontWeight: 700 }}>{r.n}</td><td>{r.a}</td><td>{r.b}</td>{usaPrio && <td>{r.p}</td>}<td>{r.fin}</td><td>{r.tat}</td><td>{r.wt}</td><td>{r.rt}</td>
									</tr>
								))}
								<tr style={{ fontWeight: 700 }}>
									<td colSpan={usaPrio ? 5 : 4}>promedio</td><td>{avg('tat')}</td><td>{avg('wt')}</td><td>{avg('rt')}</td>
								</tr>
							</tbody>
						</table>
					</div>
					<details className="pg-note">
						<summary>Por qué eligió cada proceso</summary>
						<ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
							{res.log.map((l, i) => <li key={i}>{l}</li>)}
						</ol>
					</details>
				</>
			)}
		</div>
	);
}
