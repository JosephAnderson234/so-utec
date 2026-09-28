import { useMemo, useState } from 'react';
import { motion } from 'motion/react';

type Irq = { name: string; prio: number; at: number; dur: number; color: string };
const IRQS: Irq[] = [
	{ name: 'Impresora', prio: 2, at: 10, dur: 10, color: 'var(--pg-c1)' },
	{ name: 'Comunicaciones', prio: 5, at: 15, dur: 10, color: 'var(--pg-c5)' },
	{ name: 'Disco', prio: 4, at: 20, dur: 10, color: 'var(--pg-c4)' },
];
type Seg = { who: string; from: number; to: number; color: string };

/** Simula el procesamiento de interrupciones (Stallings fig. 1.12–1.13). */
function simulate(nested: boolean): { segs: Seg[]; log: string[] } {
	const segs: Seg[] = [];
	const log: string[] = [];
	const remaining = new Map(IRQS.map((i) => [i.name, i.dur]));
	const stack: Irq[] = []; // ISR en ejecución (tope = actual)
	const pending: Irq[] = [];
	let t = 0;
	const push = (who: string, color: string) => {
		const last = segs[segs.length - 1];
		if (last && last.who === who && last.to === t) last.to = t + 1;
		else segs.push({ who, from: t, to: t + 1, color });
	};
	while (t < 60) {
		for (const i of IRQS) if (i.at === t) {
			const cur = stack[stack.length - 1];
			if (!cur) { stack.push(i); log.push(`t=${t}: llega ${i.name} (prio ${i.prio}) → interrumpe al programa de usuario`); }
			else if (nested && i.prio > cur.prio) { stack.push(i); log.push(`t=${t}: llega ${i.name} (prio ${i.prio}) > ${cur.name} (prio ${cur.prio}) → la anida`); }
			else { pending.push(i); log.push(`t=${t}: llega ${i.name} (prio ${i.prio}) → queda PENDIENTE${nested ? ` (no supera a ${cur.name}, prio ${cur.prio})` : ' (interrupciones deshabilitadas)'}`); }
		}
		const cur = stack[stack.length - 1];
		if (cur) {
			push(`ISR ${cur.name}`, cur.color);
			remaining.set(cur.name, remaining.get(cur.name)! - 1);
			if (remaining.get(cur.name) === 0) {
				stack.pop();
				log.push(`t=${t + 1}: termina ISR ${cur.name}`);
				// al terminar, se atiende la pendiente de mayor prioridad si supera a la ISR que se reanudaría
				pending.sort((a, b) => b.prio - a.prio);
				const under = stack[stack.length - 1];
				if (pending.length && (!nested || !under || pending[0].prio > under.prio)) {
					const nx = pending.shift()!;
					stack.push(nx);
					log.push(`t=${t + 1}: se atiende la pendiente ${nx.name}${under ? ` antes de reanudar ${under.name}` : ''}`);
				} else if (under) log.push(`t=${t + 1}: se reanuda ISR ${under.name}`);
				else log.push(`t=${t + 1}: vuelve el programa de usuario`);
			}
		} else push('Programa de usuario', 'var(--pg-surface-2)');
		t++;
		if (!stack.length && !pending.length && [...remaining.values()].every((v) => v === 0) && t > 45) break;
	}
	return { segs, log };
}

export default function InterruptTimeline() {
	const [nested, setNested] = useState(true);
	const [step, setStep] = useState(99);
	const { segs, log } = useMemo(() => simulate(nested), [nested]);
	const T = segs[segs.length - 1].to;
	const lanes = ['Programa de usuario', ...IRQS.map((i) => `ISR ${i.name}`)];
	const X = (t: number) => 130 + (t / T) * 470;
	const shown = log.slice(0, step);

	return (
		<div className="pg not-content">
			<h4>Interrupciones múltiples (Stallings fig. 1.12–1.13)</h4>
			<p className="pg-sub">Impresora (prioridad 2) en t = 10, comunicaciones (5) en t = 15 y disco (4) en t = 20; cada ISR dura 10. Compara las dos políticas.</p>
			<div className="pg-seg">
				<button className={!nested ? 'active' : ''} onClick={() => { setNested(false); setStep(99); }}>Secuencial (deshabilitar interrupciones)</button>
				<button className={nested ? 'active' : ''} onClick={() => { setNested(true); setStep(99); }}>Anidado por prioridades</button>
			</div>
			<svg viewBox={`0 0 610 ${lanes.length * 34 + 30}`} role="img" aria-label="diagrama de tiempo de interrupciones">
				{lanes.map((l, k) => (
					<g key={l}>
						<text x={4} y={k * 34 + 22} fontSize={11}>{l}</text>
						<line x1={130} x2={600} y1={k * 34 + 30} y2={k * 34 + 30} stroke="var(--pg-border)" />
					</g>
				))}
				{segs.map((s, k) => {
					const lane = lanes.indexOf(s.who);
					return (
						<motion.rect
							key={`${nested}-${k}`}
							x={X(s.from)}
							y={lane * 34 + 8}
							height={20}
							rx={5}
							fill={s.color}
							stroke="var(--pg-border)"
							initial={{ width: 0 }}
							animate={{ width: X(s.to) - X(s.from) }}
							transition={{ delay: k * 0.12, duration: 0.35 }}
						/>
					);
				})}
				{Array.from({ length: Math.floor(T / 5) + 1 }, (_, k) => (
					<text key={k} x={X(k * 5)} y={lanes.length * 34 + 22} fontSize={10} textAnchor="middle">{k * 5}</text>
				))}
			</svg>
			<div className="lane" style={{ flexDirection: 'column', alignItems: 'flex-start', fontSize: '0.8rem' }}>
				{shown.map((l, k) => (
					<motion.span key={`${nested}${k}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>{l}</motion.span>
				))}
			</div>
			<div className="pg-note">
				{nested
					? 'Anidado: comunicaciones (5) interrumpe a la ISR de impresora; disco (4) espera porque 4 < 5, pero al terminar comunicaciones se atiende disco ANTES de reanudar impresora (4 > 2). La impresora termina en t = 40.'
					: 'Secuencial: mientras una ISR corre, las demás interrupciones quedan pendientes y se atienden en orden. Es simple, pero ignora la urgencia: un buffer de comunicaciones podría desbordarse mientras espera.'}
			</div>
		</div>
	);
}
