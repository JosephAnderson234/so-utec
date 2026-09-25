import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

type V = Record<string, number>;
type Op =
	| { op: 'wait'; s: string | ((me: number) => string) }
	| { op: 'signal'; s: string | ((me: number) => string) }
	| { op: 'act'; txt: string; fn?: (v: V, me: number) => void }
	| { op: 'jmpIf'; txt: string; cond: (v: V) => boolean; to: number }
	| { op: 'goto'; to: number; txt?: string };
type ProcDef = { name: string; code: Op[]; me?: number };
type Scenario = { id: string; name: string; fuente: string; sems: V; vars: V; procs: ProcDef[]; nota: string; show?: (v: V) => string };

type P = { pc: number; blockedOn: string | null };
type St = { sems: V; queues: Record<string, number[]>; vars: V; procs: P[]; log: string[] };

const sname = (s: Op & { s: unknown }, me: number) => (typeof s.s === 'function' ? s.s(me) : (s.s as string));

const prodcons = (bad: boolean): Scenario => {
	const prod: Op[] = bad
		? [
				{ op: 'wait', s: 'mutex' },
				{ op: 'wait', s: 'vacios' },
				{ op: 'act', txt: 'insertar_elemento();', fn: (v) => void v.buffer++ },
				{ op: 'signal', s: 'llenos' },
				{ op: 'signal', s: 'mutex' },
				{ op: 'goto', to: 0 },
			]
		: [
				{ op: 'wait', s: 'vacios' },
				{ op: 'wait', s: 'mutex' },
				{ op: 'act', txt: 'insertar_elemento();', fn: (v) => void v.buffer++ },
				{ op: 'signal', s: 'mutex' },
				{ op: 'signal', s: 'llenos' },
				{ op: 'goto', to: 0 },
			];
	const cons: Op[] = [
		{ op: 'wait', s: 'llenos' },
		{ op: 'wait', s: 'mutex' },
		{ op: 'act', txt: 'extraer_elemento();', fn: (v) => void v.buffer-- },
		{ op: 'signal', s: 'mutex' },
		{ op: 'signal', s: 'vacios' },
		{ op: 'goto', to: 0 },
	];
	return {
		id: bad ? 'pc-bad' : 'pc-ok',
		name: bad ? 'Productor con mutex primero (E1 2026-1 P1.3)' : 'Productor–consumidor correcto',
		fuente: bad ? 'E1 2026-1, Pregunta 1.3' : 'lab2 · 08-OSL-Producer Consumers',
		sems: { mutex: 1, vacios: 2, llenos: 0 },
		vars: { buffer: 0 },
		procs: [
			{ name: 'Productor', code: prod },
			{ name: 'Consumidor', code: cons },
		],
		show: (v) => `buffer: ${'■'.repeat(Math.max(0, v.buffer))}${'□'.repeat(Math.max(0, 2 - v.buffer))} (${v.buffer}/2)`,
		nota: bad
			? 'Llena el buffer (produce 2 veces) y vuelve a producir: el productor toma mutex y se bloquea en vacios, sosteniendo mutex. El consumidor se bloquea en mutex → deadlock. Respuesta: (C).'
			: 'Orden correcto: primero el semáforo de conteo (vacios/llenos) y luego mutex. Nunca te bloqueas mientras sostienes mutex.',
	};
};

const stock: Scenario = {
	id: 'stock',
	name: 'Stock con ifs (E1 2024-I P3)',
	fuente: 'E1 2024-I, Pregunta 3',
	sems: { resource: 1, restock: 0 },
	vars: { stock: 0 },
	procs: [
		{
			name: 'Seller',
			code: [
				{ op: 'wait', s: 'resource' },
				{ op: 'act', txt: 'add_one_stock();', fn: (v) => void v.stock++ },
				{ op: 'jmpIf', txt: 'if (stock == 1)', cond: (v) => v.stock !== 1, to: 4 },
				{ op: 'signal', s: 'restock' },
				{ op: 'signal', s: 'resource' },
				{ op: 'goto', to: 0 },
			],
		},
		{
			name: 'Buyer',
			code: [
				{ op: 'wait', s: 'restock' },
				{ op: 'wait', s: 'resource' },
				{ op: 'jmpIf', txt: 'if (stock == 0)', cond: (v) => v.stock !== 0, to: 4 },
				{ op: 'wait', s: 'restock' },
				{ op: 'act', txt: 'buy_one_stock();', fn: (v) => void v.stock-- },
				{ op: 'signal', s: 'resource' },
				{ op: 'goto', to: 1 },
			],
		},
	],
	show: (v) => `stock = ${v.stock}`,
	nota: 'Traza de deadlock: Seller ×5 (stock = 1, restock = 1) → Buyer compra (stock = 0) y vuelve a pedir resource → ve stock == 0 y hace wait(restock) SOSTENIENDO resource → Seller se bloquea en wait(resource).',
};

const BUDDY = [5, 6, 3, 2, 7, 0, 1, 4]; // índices 0..7 = guerreros 1..8: (1,6) (2,7) (3,4) (5,8)
const warriors: Scenario = {
	id: 'aretes',
	name: 'Guerreros y aretes (E1 2024-I P4)',
	fuente: 'E1 2024-I, Pregunta 4',
	sems: { earrings: 4, ...Object.fromEntries(Array.from({ length: 8 }, (_, i) => [`ready[${i + 1}]`, 0])) },
	vars: {},
	procs: Array.from({ length: 8 }, (_, i) => ({
		name: `G${i + 1}`,
		me: i,
		code: [
			{ op: 'wait', s: 'earrings' },
			{ op: 'act', txt: 'put_earring();' },
			{ op: 'signal', s: (me: number) => `ready[${me + 1}]` },
			{ op: 'wait', s: (me: number) => `ready[${BUDDY[me] + 1}]` },
			{ op: 'act', txt: 'fusion(); fight(); undo_fusion();' },
			{ op: 'signal', s: 'earrings' },
			{ op: 'goto', to: 0 },
		] as Op[],
	})),
	nota: 'Parejas: (1,6) (2,7) (3,4) (5,8). Deadlock: que tomen arete UN guerrero de cada pareja, por ejemplo G1, G2, G3 y G5. Cada uno espera a su pareja, que está bloqueada esperando un arete. Ojo: el solucionario oficial dice «1, 2, 3 y 6», pero 1 y 6 son pareja y sí podrían fusionarse.',
};

const SCEN: Record<string, Scenario> = { 'pc-ok': prodcons(false), 'pc-bad': prodcons(true), stock, aretes: warriors };

function opText(o: Op, me: number) {
	switch (o.op) {
		case 'wait': return `wait(${sname(o, me)});`;
		case 'signal': return `signal(${sname(o, me)});`;
		case 'act': return o.txt;
		case 'jmpIf': return o.txt;
		case 'goto': return o.txt ?? `goto ${o.to};`;
	}
}

function init(sc: Scenario): St {
	return {
		sems: { ...sc.sems },
		queues: Object.fromEntries(Object.keys(sc.sems).map((k) => [k, []])),
		vars: { ...sc.vars },
		procs: sc.procs.map(() => ({ pc: 0, blockedOn: null })),
		log: [],
	};
}

function stepProc(sc: Scenario, st: St, i: number): St {
	const n: St = JSON.parse(JSON.stringify(st));
	const p = n.procs[i];
	if (p.blockedOn) return st;
	const def = sc.procs[i];
	const me = def.me ?? i;
	const o = def.code[p.pc];
	const who = def.name;
	switch (o.op) {
		case 'wait': {
			const s = sname(o, me);
			n.sems[s]--;
			if (n.sems[s] < 0) {
				p.blockedOn = s;
				n.queues[s].push(i);
				n.log.push(`${who} se bloquea en ${s}`);
			} else n.log.push(`${who}: wait(${s}) pasa`);
			p.pc++;
			break;
		}
		case 'signal': {
			const s = sname(o, me);
			n.sems[s]++;
			if (n.sems[s] <= 0 && n.queues[s].length) {
				const w = n.queues[s].shift()!;
				n.procs[w].blockedOn = null;
				n.log.push(`${who}: signal(${s}) despierta a ${sc.procs[w].name}`);
			} else n.log.push(`${who}: signal(${s})`);
			p.pc++;
			break;
		}
		case 'act':
			o.fn?.(n.vars, me);
			n.log.push(`${who}: ${o.txt}`);
			p.pc++;
			break;
		case 'jmpIf':
			p.pc = o.cond(n.vars) ? o.to : p.pc + 1;
			break;
		case 'goto':
			p.pc = o.to;
			break;
	}
	return n;
}

export default function SemaphoreSim({ scenario = 'pc-ok', choices }: { scenario?: string; choices?: string[] }) {
	const [sid, setSid] = useState(scenario);
	const sc = SCEN[sid];
	const [hist, setHist] = useState<St[]>([init(sc)]);
	const st = hist[hist.length - 1];
	const allBlocked = st.procs.every((p) => p.blockedOn);
	const choose = (id: string) => {
		setSid(id);
		setHist([init(SCEN[id])]);
	};
	const step = (i: number) => setHist((h) => [...h, stepProc(sc, h[h.length - 1], i)]);
	const random = () => {
		const ready = st.procs.map((p, i) => (p.blockedOn ? -1 : i)).filter((i) => i >= 0);
		if (ready.length) step(ready[Math.floor(Math.random() * ready.length)]);
	};
	const many = sc.procs.length > 3;

	return (
		<div className="pg not-content">
			<h4>Simulador de semáforos</h4>
			<p className="pg-sub">Haz clic en un proceso para ejecutar su siguiente instrucción. Semántica de Stallings: el valor puede ser negativo (|valor| = procesos en cola) y la cola es FIFO.</p>
			{choices && (
				<div className="pg-seg">
					{choices.map((c) => (
						<button key={c} className={c === sid ? 'active' : ''} onClick={() => choose(c)}>
							{SCEN[c].name}
						</button>
					))}
				</div>
			)}
			<LayoutGroup>
				<div className="pg-stats">
					{Object.keys(st.sems)
						.filter((k) => !many || !k.startsWith('ready') || st.sems[k] !== 0 || st.queues[k].length)
						.map((k) => (
							<motion.div layout className="pg-stat" key={k} style={st.sems[k] < 0 ? { background: 'color-mix(in srgb, var(--pg-bad) 12%, transparent)' } : undefined}>
								<span className="k mono">{k}</span>
								<motion.span className="v mono" key={st.sems[k]} initial={{ scale: 1.3, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}>
									{st.sems[k]}
								</motion.span>
								<span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4, minHeight: 20 }}>
									<AnimatePresence>
										{st.queues[k].map((w) => (
											<motion.span key={w} layoutId={`q${w}`} className="badge" style={{ background: 'var(--pg-bad)' }} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
												{sc.procs[w].name}
											</motion.span>
										))}
									</AnimatePresence>
								</span>
							</motion.div>
						))}
				</div>
				{sc.show && <div className="pg-note mono">{sc.show(st.vars)}</div>}
				<div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: `repeat(auto-fit, minmax(${many ? '9.5rem' : '15rem'}, 1fr))` }}>
					{sc.procs.map((d, i) => {
						const p = st.procs[i];
						const at = p.blockedOn ? p.pc - 1 : p.pc; // bloqueado: señalar el wait donde espera
						return (
							<motion.button
								layout
								key={i}
								onClick={() => step(i)}
								disabled={!!p.blockedOn}
								whileTap={{ scale: 0.97 }}
								style={{ textAlign: 'left', borderRadius: 14, padding: '0.7rem', display: 'block', width: '100%', borderColor: p.blockedOn ? 'var(--pg-bad)' : 'var(--pg-border)', opacity: 1 }}
							>
								<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
									<b>{d.name}</b>
									<span className={`sim-proc ${p.blockedOn ? 'blk' : 'run'}`} style={{ padding: '0 0.45rem', fontSize: '0.68rem' }}>
										{p.blockedOn ? `bloqueado: ${p.blockedOn}` : 'listo'}
									</span>
								</div>
								{!many &&
									d.code.map((o, k) => (
										<div key={k} className="mono" style={{ fontSize: '0.74rem', padding: '1px 6px', borderRadius: 6, background: k === at ? (p.blockedOn ? 'color-mix(in srgb, var(--pg-bad) 16%, transparent)' : 'color-mix(in srgb, var(--sl-color-accent) 18%, transparent)') : undefined }}>
											{k === at ? '▶ ' : '  '}
											{opText(o, d.me ?? i)}
										</div>
									))}
								{many && <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--pg-muted)' }}>▶ {opText(d.code[at], d.me ?? i)}</div>}
							</motion.button>
						);
					})}
				</div>
			</LayoutGroup>
			<div className="pg-row">
				<button className="primary" onClick={random} disabled={allBlocked}>Paso aleatorio</button>
				<button onClick={() => hist.length > 1 && setHist((h) => h.slice(0, -1))} disabled={hist.length < 2}>Deshacer</button>
				<button onClick={() => setHist([init(sc)])}>Reiniciar</button>
			</div>
			<AnimatePresence>
				{allBlocked && (
					<motion.div className="pg-note bad" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
						🔒 <b>DEADLOCK:</b> todos los procesos están bloqueados y nadie puede hacer <code>signal</code>.
					</motion.div>
				)}
			</AnimatePresence>
			<div className="lane" style={{ maxHeight: '6.5rem', overflowY: 'auto', fontSize: '0.75rem', alignItems: 'flex-start' }}>
				{st.log.length ? st.log.slice(-12).map((l, k) => <span key={k} className="sim-proc">{l}</span>) : <span style={{ color: 'var(--pg-muted)' }}>Registro vacío.</span>}
			</div>
			<div className="pg-note">{sc.nota}</div>
		</div>
	);
}
