import { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type W = { s: number; e: number; v: string };
type R = { s: number; e: number; v: string; lane: number };
type Sc = { name: string; init: string; writes: W[]; reads: R[]; domain: string[]; hint: string };

const SCEN: Sc[] = [
	{
		name: 'Lecturas sin solapamiento',
		init: '0',
		writes: [{ s: 1, e: 3, v: '1001' }],
		reads: [{ s: 4, e: 6, v: '1001', lane: 0 }],
		domain: ['0', '1001', '1111'],
		hint: 'Sin solapamiento, cualquier registro (incluso safe) debe devolver el último valor escrito.',
	},
	{
		name: 'Safe: solapa y devuelve basura',
		init: '0000',
		writes: [{ s: 1, e: 7, v: '1001' }],
		reads: [{ s: 3, e: 5, v: '1111', lane: 0 }],
		domain: ['0000', '1001', '1111'],
		hint: 'Si la lectura se solapa con una escritura, un registro safe puede devolver cualquier valor del dominio (1111 nunca se escribió).',
	},
	{
		name: '¿Regular o no? (diap. 14–17)',
		init: '0',
		writes: [
			{ s: 0, e: 2, v: '0' },
			{ s: 4, e: 11, v: '1' },
		],
		reads: [
			{ s: 5, e: 7, v: '1', lane: 0 },
			{ s: 8, e: 10, v: '0', lane: 1 },
		],
		domain: ['0', '1'],
		hint: 'Cada lectura se solapa con write(1): puede devolver el valor viejo (0) o el nuevo (1), así que es regular. Pero read(1) terminó antes de que empezara read(0): esa inversión nuevo→viejo no es linealizable, así que NO es atómico.',
	},
	{
		name: 'Atómico (diap. 19)',
		init: '0000',
		writes: [
			{ s: 0, e: 3, v: '1001' },
			{ s: 5, e: 9, v: '1010' },
		],
		reads: [
			{ s: 1, e: 4, v: '1001', lane: 0 },
			{ s: 6, e: 7, v: '1010', lane: 0 },
			{ s: 8, e: 11, v: '1010', lane: 1 },
		],
		domain: ['0000', '1001', '1010'],
		hint: 'Existe un orden secuencial (linealización) consistente con los tiempos: w(1001) · r · w(1010) · r · r.',
	},
];

function classify(sc: Sc, reads: R[]) {
	const ws = sc.writes;
	const cands = reads.map((r) => {
		const prior = ws.map((w, i) => ({ w, i })).filter((x) => x.w.e < r.s);
		const priorIdx = prior.length ? prior[prior.length - 1].i : -1;
		const overl = ws.map((w, i) => ({ w, i })).filter((x) => x.w.s < r.e && x.w.e > r.s);
		const val = (i: number) => (i < 0 ? sc.init : ws[i].v);
		const opts = [priorIdx, ...overl.map((x) => x.i)].filter((i) => val(i) === r.v);
		return { overlaps: overl.length > 0, prior: val(priorIdx), opts };
	});
	const safe = cands.every((c, k) => c.overlaps || reads[k].v === c.prior);
	const regular = cands.every((c) => c.opts.length > 0);
	// atómico: asignar a cada lectura una escritura sin inversiones nuevo→viejo
	let atomic = false;
	if (regular) {
		const rec = (k: number, chosen: number[]): boolean => {
			if (k === reads.length) {
				for (let a = 0; a < reads.length; a++)
					for (let b = 0; b < reads.length; b++) if (reads[a].e < reads[b].s && chosen[a] > chosen[b]) return false;
				return true;
			}
			return cands[k].opts.some((o) => rec(k + 1, [...chosen, o]));
		};
		atomic = rec(0, []);
	}
	return { safe, regular, atomic };
}

export default function RegisterTimeline() {
	const [si, setSi] = useState(2);
	const sc = SCEN[si];
	const [reads, setReads] = useState<R[]>(sc.reads);
	const pick = (i: number) => {
		setSi(i);
		setReads(SCEN[i].reads);
	};
	const cyc = (k: number) =>
		setReads((rs) => rs.map((r, i) => (i === k ? { ...r, v: sc.domain[(sc.domain.indexOf(r.v) + 1) % sc.domain.length] } : r)));
	const c = useMemo(() => classify(sc, reads), [sc, reads]);
	const T = 12;
	const X = (t: number) => 70 + (t / T) * 520;
	const lanes = 1 + Math.max(...reads.map((r) => r.lane)) + 1;

	const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
		<motion.span className="sim-proc" key={label + ok} initial={{ scale: 0.85 }} animate={{ scale: 1 }} style={{ borderColor: ok ? 'var(--pg-ok)' : 'var(--pg-bad)', color: ok ? 'var(--pg-ok)' : 'var(--pg-bad)' }}>
			{ok ? '✔' : '✘'} {label}
		</motion.span>
	);

	return (
		<div className="pg not-content">
			<h4>¿Safe, regular o atómico?</h4>
			<p className="pg-sub">Un escritor y varios lectores (MRSW). <b>Haz clic en una lectura</b> para cambiar el valor que devuelve y observa cómo cambia la clasificación.</p>
			<div className="pg-seg">
				{SCEN.map((s, i) => (
					<button key={i} className={i === si ? 'active' : ''} onClick={() => pick(i)}>
						{s.name}
					</button>
				))}
			</div>
			<svg viewBox={`0 0 620 ${40 + lanes * 50}`} role="img" aria-label="línea de tiempo">
				<line x1={70} x2={600} y1={20 + lanes * 50} y2={20 + lanes * 50} stroke="var(--pg-border)" />
				<text x={600} y={36 + lanes * 50} textAnchor="end" fontSize={11}>tiempo →</text>
				<text x={8} y={42} fontSize={12}>Escritor</text>
				{sc.writes.map((w, k) => (
					<motion.g key={k} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.08 }}>
						<rect x={X(w.s)} y={26} width={X(w.e) - X(w.s)} height={26} rx={8} fill="color-mix(in srgb, var(--sl-color-accent) 30%, transparent)" stroke="var(--sl-color-accent)" />
						<text x={(X(w.s) + X(w.e)) / 2} y={44} textAnchor="middle" fontSize={12} style={{ fill: 'var(--sl-color-white)' }}>
							write({w.v})
						</text>
					</motion.g>
				))}
				{Array.from({ length: lanes - 1 }, (_, l) => (
					<text key={l} x={8} y={92 + l * 50} fontSize={12}>
						Lector {String.fromCharCode(65 + l)}
					</text>
				))}
				{reads.map((r, k) => (
					<g key={k} onClick={() => cyc(k)} style={{ cursor: 'pointer' }}>
						<motion.rect layout x={X(r.s)} y={76 + r.lane * 50} width={X(r.e) - X(r.s)} height={26} rx={8} fill="color-mix(in srgb, var(--pg-violet) 28%, transparent)" stroke="var(--pg-violet)" whileHover={{ scale: 1.04 }} />
						<text x={(X(r.s) + X(r.e)) / 2} y={94 + r.lane * 50} textAnchor="middle" fontSize={12} style={{ fill: 'var(--sl-color-white)', pointerEvents: 'none' }}>
							read({r.v})
						</text>
					</g>
				))}
			</svg>
			<div className="pg-row">
				<Pill ok={c.safe} label="safe" />
				<Pill ok={c.regular} label="regular" />
				<Pill ok={c.atomic} label="atómico (linealizable)" />
			</div>
			<div className="pg-note">{sc.hint}</div>
		</div>
	);
}
