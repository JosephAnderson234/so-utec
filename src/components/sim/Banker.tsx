import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Mode = 'avoid' | 'detect';
type Preset = { name: string; mode: Mode; R: number[]; C?: number[][]; A: number[][]; Q?: number[][]; req?: { p: number; v: number[] }[]; nota: string };

const PRESETS: Preset[] = [
	{
		name: 'Fig. 6.7a · estado seguro',
		mode: 'avoid',
		R: [9, 3, 6],
		C: [[3, 2, 2], [6, 1, 3], [3, 1, 4], [4, 2, 2]],
		A: [[1, 0, 0], [6, 1, 2], [2, 1, 1], [0, 0, 2]],
		nota: 'V = (0,1,1). Solo P2 puede terminar (le falta (0,0,1)); al liberar, todos los demás pueden. Secuencia segura: P2, P1, P3, P4.',
	},
	{
		name: 'Fig. 6.8a · decidir una petición',
		mode: 'avoid',
		R: [9, 3, 6],
		C: [[3, 2, 2], [6, 1, 3], [3, 1, 4], [4, 2, 2]],
		A: [[1, 0, 0], [5, 1, 1], [2, 1, 1], [0, 0, 2]],
		req: [
			{ p: 1, v: [1, 0, 1] },
			{ p: 0, v: [1, 0, 1] },
		],
		nota: 'Prueba las dos peticiones: si P2 pide (1,0,1) se llega a la fig. 6.7a, que es segura, así que se CONCEDE. Si P1 pide (1,0,1) se llega a la fig. 6.8b, insegura porque todos necesitan R1 y no queda, así que se DENIEGA (inseguro no es lo mismo que deadlock).',
	},
	{
		name: 'Fig. 6.10 · detección',
		mode: 'detect',
		R: [2, 1, 1, 2, 1],
		A: [[1, 0, 1, 1, 0], [1, 1, 0, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 0]],
		Q: [[0, 1, 0, 0, 1], [0, 0, 1, 0, 1], [0, 0, 0, 0, 1], [1, 0, 1, 0, 1]],
		nota: 'Se marca P4 (no tiene nada asignado) y W = V = (0,0,0,0,1). P3 pide ≤ W: se marca y W = (0,0,0,1,1). Ningún otro cabe, así que P1 y P2 quedan sin marcar: están en DEADLOCK.',
	},
];

const add = (a: number[], b: number[]) => a.map((x, k) => x + b[k]);
const sub = (a: number[], b: number[]) => a.map((x, k) => x - b[k]);
const le = (a: number[], b: number[]) => a.every((x, k) => x <= b[k]);

type Step = { pick: number | null; W: number[]; marked: boolean[]; msg: string };

function runSafety(need: number[][], A: number[][], V: number[], detect: boolean): Step[] {
	const n = A.length;
	const marked = A.map((row) => (detect ? row.every((x) => x === 0) : false));
	let W = [...V];
	const steps: Step[] = [{ pick: null, W: [...W], marked: [...marked], msg: detect ? `Se marcan los procesos sin nada asignado${marked.some(Boolean) ? ` (${marked.map((m, i) => (m ? `P${i + 1}` : '')).filter(Boolean).join(', ')})` : ''}. W = Available = (${W.join(',')})` : `currentavail = Available = (${W.join(',')})` }];
	for (;;) {
		const i = need.findIndex((row, k) => !marked[k] && le(row, W));
		if (i < 0) break;
		marked[i] = true;
		W = add(W, A[i]);
		steps.push({ pick: i, W: [...W], marked: [...marked], msg: `P${i + 1}: ${detect ? 'Q' : 'C − A'} = (${need[i].join(',')}) ≤ (${sub(W, A[i]).join(',')}) → termina y libera (${A[i].join(',')}). Ahora W = (${W.join(',')})` });
	}
	const rest = marked.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0);
	steps.push({
		pick: null,
		W: [...W],
		marked: [...marked],
		msg: rest.length === 0 ? (detect ? 'Todos marcados: NO hay deadlock.' : 'Todos pueden terminar: estado SEGURO.') : detect ? `Quedan sin marcar ${rest.map((i) => `P${i + 1}`).join(', ')}: están en DEADLOCK.` : `Nadie más puede terminar (${rest.map((i) => `P${i + 1}`).join(', ')}): estado INSEGURO.`,
	});
	return steps;
}

type MProps = { title: string; M: number[][]; cols: number; marked: boolean[]; pick: number | null; onEdit?: (i: number, k: number, v: number) => void };
function Matrix({ title, M, cols, marked, pick, onEdit }: MProps) {
	return (
		<div>
			<span className="lane-label">{title}</span>
			<table>
				<thead>
					<tr><th></th>{Array.from({ length: cols }, (_, k) => <th key={k}>R{k + 1}</th>)}</tr>
				</thead>
				<tbody>
					{M.map((row, i) => (
						<motion.tr key={i} animate={{ backgroundColor: marked[i] ? 'color-mix(in srgb, var(--pg-ok) 16%, transparent)' : pick === i ? 'color-mix(in srgb, var(--sl-color-accent) 20%, transparent)' : 'rgba(0,0,0,0)' }}>
							<td><b>P{i + 1}</b></td>
							{row.map((x, k) => (
								<td key={k}>
									{onEdit ? (
										<input type="number" min={0} value={x} onChange={(e) => onEdit(i, k, +e.target.value)} style={{ width: '3.2rem', minHeight: '1.8rem', padding: '0.1rem 0.3rem' }} />
									) : (
										x
									)}
								</td>
							))}
						</motion.tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

export default function Banker() {
	const [pi, setPi] = useState(0);
	const p = PRESETS[pi];
	const [A, setA] = useState(p.A);
	const [C, setC] = useState(p.C ?? []);
	const [Q, setQ] = useState(p.Q ?? []);
	const [t, setT] = useState(0);
	const [reqMsg, setReqMsg] = useState<string | null>(null);
	const load = (i: number) => {
		const q = PRESETS[i];
		setPi(i);
		setA(q.A.map((r) => [...r]));
		setC((q.C ?? []).map((r) => [...r]));
		setQ((q.Q ?? []).map((r) => [...r]));
		setT(0);
		setReqMsg(null);
	};
	const detect = p.mode === 'detect';
	const V = sub(p.R, A.reduce((acc, r) => add(acc, r), p.R.map(() => 0)));
	const need = detect ? Q : C.map((row, i) => sub(row, A[i]));
	const steps = useMemo(() => runSafety(need, A, V, detect), [need, A, V, detect]);
	const cur = steps[Math.min(t, steps.length - 1)];

	const request = (r: { p: number; v: number[] }) => {
		const newA = A.map((row, i) => (i === r.p ? add(row, r.v) : [...row]));
		if (!le(add(A[r.p], r.v), C[r.p])) return setReqMsg('Error: excede su claim.');
		if (!le(r.v, V)) return setReqMsg(`P${r.p + 1} pide (${r.v.join(',')}), pero Available = (${V.join(',')}): se suspende (no alcanza).`);
		const newV = sub(V, r.v);
		const ok = !runSafety(C.map((row, i) => sub(row, newA[i])), newA, newV, false).slice(-1)[0].msg.includes('INSEGURO');
		setA(newA);
		setT(0);
		setReqMsg(`P${r.p + 1} pide (${r.v.join(',')}). Se simula la asignación y se corre la prueba de seguridad: ${ok ? 'estado SEGURO, así que se CONCEDE' : 'estado INSEGURO, así que se DENIEGA (se restaura el estado y P se bloquea). La tabla muestra el estado hipotético'}.`);
	};

	const edit = (M: number[][], set: (m: number[][]) => void, i: number, k: number, v: number) => {
		const m = M.map((r) => [...r]);
		m[i][k] = Math.max(0, v);
		set(m);
		setT(0);
	};

	return (
		<div className="pg not-content">
			<h4>{detect ? 'Algoritmo de detección de deadlock' : 'Algoritmo del banquero (prueba de seguridad)'}</h4>
			<p className="pg-sub">Las matrices son editables. Avanza paso a paso: en verde los procesos que pueden terminar (se marcan) y en ámbar el elegido en cada paso.</p>
			<div className="pg-seg">
				{PRESETS.map((q, i) => (
					<button key={q.name} className={i === pi ? 'active' : ''} onClick={() => load(i)}>{q.name}</button>
				))}
			</div>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Resource R</span><span className="v mono">({p.R.join(',')})</span></div>
				<div className="pg-stat"><span className="k">Available V = R − ΣA</span><span className="v mono">({V.join(',')})</span></div>
				<div className="pg-stat"><span className="k">{detect ? 'W' : 'currentavail'} (paso {Math.min(t, steps.length - 1)})</span><motion.span key={cur.W.join()} className="v mono" initial={{ scale: 1.2 }} animate={{ scale: 1 }}>({cur.W.join(',')})</motion.span></div>
			</div>
			<div className="pg-scroll">
				<div className="pg-grid-2">
					{detect ? (
						<Matrix title="Request Q" M={Q} cols={p.R.length} marked={cur.marked} pick={cur.pick} onEdit={(i, k, v) => edit(Q, setQ, i, k, v)} />
					) : (
						<Matrix title="Claim C (máximo declarado)" M={C} cols={p.R.length} marked={cur.marked} pick={cur.pick} onEdit={(i, k, v) => edit(C, setC, i, k, v)} />
					)}
					<Matrix title="Allocation A" M={A} cols={p.R.length} marked={cur.marked} pick={cur.pick} onEdit={(i, k, v) => edit(A, setA, i, k, v)} />
				</div>
			</div>
			{!detect && (
				<div>
					<span className="lane-label">Need = C − A</span>
					<div className="lane mono" style={{ fontSize: '0.8rem' }}>
						{need.map((r, i) => <span key={i} className="sim-proc">P{i + 1}: ({r.join(',')})</span>)}
					</div>
				</div>
			)}
			<div className="pg-row">
				<button className="primary" onClick={() => setT((x) => Math.min(steps.length - 1, x + 1))} disabled={t >= steps.length - 1}>Siguiente paso</button>
				<button onClick={() => setT(steps.length - 1)}>Ver resultado</button>
				<button onClick={() => load(pi)}>Reiniciar</button>
				{p.req?.map((r, k) => (
					<button key={k} onClick={() => request(r)} style={{ borderColor: 'var(--pg-violet)' }}>P{r.p + 1} pide ({r.v.join(',')})</button>
				))}
			</div>
			<AnimatePresence mode="wait">
				<motion.div key={`${pi}-${t}-${cur.msg}`} className={`pg-note ${t === steps.length - 1 ? (cur.msg.includes('INSEGURO') || cur.msg.includes('DEADLOCK') ? 'bad' : 'ok') : ''}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
					{cur.msg}
				</motion.div>
			</AnimatePresence>
			{reqMsg && <div className="pg-note warn">{reqMsg}</div>}
			<div className="pg-note">{p.nota}</div>
		</div>
	);
}
