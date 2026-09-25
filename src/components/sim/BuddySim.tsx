import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Blk = { start: number; size: number; owner: string | null; req?: number };
type Op = { kind: 'req'; name: string; size: number } | { kind: 'rel'; name: string };

const TOTAL = 1024; // K
const MIN = 16;
const SLIDE: Op[] = [
	{ kind: 'req', name: 'A', size: 100 },
	{ kind: 'req', name: 'B', size: 240 },
	{ kind: 'req', name: 'C', size: 64 },
	{ kind: 'req', name: 'D', size: 256 },
	{ kind: 'rel', name: 'B' },
	{ kind: 'rel', name: 'A' },
	{ kind: 'req', name: 'E', size: 75 },
	{ kind: 'rel', name: 'C' },
	{ kind: 'rel', name: 'E' },
	{ kind: 'rel', name: 'D' },
];
const COLORS: Record<string, string> = { A: 'var(--pg-c1)', B: 'var(--pg-c2)', C: 'var(--pg-c3)', D: 'var(--pg-c4)', E: 'var(--pg-c5)' };
const color = (n: string) => COLORS[n] ?? `hsl(${(n.charCodeAt(0) * 47) % 360}, 60%, 66%)`;

function apply(blocks: Blk[], op: Op): { blocks: Blk[]; msg: string } {
	let b = blocks.map((x) => ({ ...x }));
	if (op.kind === 'req') {
		let need = MIN;
		while (need < op.size) need *= 2;
		const cands = b.filter((x) => !x.owner && x.size >= need).sort((p, q) => p.size - q.size || p.start - q.start);
		if (!cands.length) return { blocks, msg: `No hay bloque libre de ${need}K para ${op.name}` };
		let blk = cands[0];
		const splits: number[] = [];
		while (blk.size > need) {
			const half = blk.size / 2;
			b = b.filter((x) => x !== blk).concat([{ start: blk.start, size: half, owner: null }, { start: blk.start + half, size: half, owner: null }]);
			splits.push(blk.size);
			blk = b.find((x) => x.start === blk.start && x.size === half)!;
		}
		blk.owner = op.name;
		blk.req = op.size;
		b.sort((p, q) => p.start - q.start);
		return { blocks: b, msg: `${op.name} pide ${op.size}K → bloque de ${need}K en ${blk.start}K${splits.length ? ` (divide ${splits.map((s) => s + 'K').join(' → ')})` : ''}. Frag. interna: ${need - op.size}K` };
	}
	const blk = b.find((x) => x.owner === op.name);
	if (!blk) return { blocks, msg: `${op.name} no está asignado` };
	blk.owner = null;
	delete blk.req;
	let cur = blk;
	const merges: number[] = [];
	for (;;) {
		const buddyStart = cur.start ^ cur.size; // el buddy difiere solo en el bit del tamaño
		const buddy = b.find((x) => x.start === buddyStart && x.size === cur.size && !x.owner);
		if (!buddy || cur.size === TOTAL) break;
		const merged = { start: Math.min(cur.start, buddy.start), size: cur.size * 2, owner: null };
		b = b.filter((x) => x !== cur && x !== buddy).concat([merged]);
		merges.push(merged.size);
		cur = merged;
	}
	b.sort((p, q) => p.start - q.start);
	return { blocks: b, msg: `Libera ${op.name}${merges.length ? ` → fusiona con su buddy: ${merges.map((s) => s + 'K').join(' → ')}` : ' → su buddy está ocupado o dividido, no fusiona'}` };
}

export default function BuddySim() {
	const [ops, setOps] = useState<Op[]>([]);
	const [name, setName] = useState('F');
	const [size, setSize] = useState(90);
	const { blocks, msgs } = useMemo(() => {
		let b: Blk[] = [{ start: 0, size: TOTAL, owner: null }];
		const m: string[] = [];
		for (const o of ops) {
			const r = apply(b, o);
			b = r.blocks;
			m.push(r.msg);
		}
		return { blocks: b, msgs: m };
	}, [ops]);
	const next = SLIDE[ops.length];
	const slideMode = ops.every((o, i) => JSON.stringify(o) === JSON.stringify(SLIDE[i]));
	const owners = blocks.filter((b) => b.owner).map((b) => b.owner!);
	const used = blocks.filter((b) => b.owner).reduce((a, b) => a + b.size, 0);
	const internal = blocks.filter((b) => b.owner).reduce((a, b) => a + (b.size - (b.req ?? b.size)), 0);

	return (
		<div className="pg not-content">
			<h4>Buddy system (1 MiB)</h4>
			<p className="pg-sub">Bloques de tamaño 2<sup>k</sup>. Pedir: redondear a potencia de 2 y dividir a la mitad hasta ajustar. Liberar: fusionar con el <i>buddy</i> mientras esté libre. Empieza con la secuencia de la diapositiva 19.</p>
			<div className="membar" style={{ height: '4rem' }}>
				<AnimatePresence initial={false}>
					{blocks.map((b) => (
						<motion.div
							key={`${b.start}-${b.size}`}
							layout
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ type: 'spring', stiffness: 260, damping: 30 }}
							className={b.owner ? '' : 'free'}
							style={{ flex: `${b.size} 1 0`, background: b.owner ? color(b.owner) : undefined, flexDirection: 'column', lineHeight: 1.2 }}
							title={`${b.start}K–${b.start + b.size}K`}
						>
							<span>{b.owner ? `${b.owner}` : ''}</span>
							<span>{b.size}K</span>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Asignado</span><span className="v">{used}K</span></div>
				<div className="pg-stat"><span className="k">Frag. interna</span><span className="v">{internal}K</span></div>
				<div className="pg-stat"><span className="k">Bloques libres</span><span className="v">{blocks.filter((b) => !b.owner).map((b) => b.size + 'K').join(', ') || '—'}</span></div>
			</div>
			<div className="pg-row">
				{slideMode && next && (
					<button className="primary" onClick={() => setOps((o) => [...o, next])}>
						{next.kind === 'req' ? `Pedir ${next.name} = ${next.size}K` : `Liberar ${next.name}`}
					</button>
				)}
				<button onClick={() => setOps((o) => o.slice(0, -1))} disabled={!ops.length}>Deshacer</button>
				<button onClick={() => setOps([])}>Reiniciar</button>
			</div>
			<div className="pg-row">
				<label className="pg-field" style={{ maxWidth: '6rem' }}><span>Nombre</span><input type="text" value={name} maxLength={2} onChange={(e) => setName(e.target.value.toUpperCase())} /></label>
				<label className="pg-field"><span>Tamaño: <b>{size}K</b></span><input type="range" min={1} max={512} value={size} onChange={(e) => setSize(+e.target.value)} /></label>
				<button onClick={() => name && !owners.includes(name) && setOps((o) => [...o, { kind: 'req', name, size }])} disabled={!name || owners.includes(name)}>Pedir</button>
				{owners.map((o) => (
					<button key={o} onClick={() => setOps((x) => [...x, { kind: 'rel', name: o }])}>Liberar {o}</button>
				))}
			</div>
			<AnimatePresence mode="wait">
				{msgs.length > 0 && (
					<motion.div key={msgs.length} className="pg-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
						{msgs[msgs.length - 1]}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
