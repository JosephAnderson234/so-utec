import { useState } from 'react';
import { motion } from 'motion/react';
import Tex from '../ui/Tex';

/** Tiempo efectivo de acceso a memoria con TLB y tablas de k niveles. */
export default function TlbEat() {
	const [h, setH] = useState(0.98);
	const [tlb, setTlb] = useState(1);
	const [mem, setMem] = useState(100);
	const [k, setK] = useState(1);
	const hit = tlb + mem;
	const miss = tlb + k * mem + mem;
	const eat = h * hit + (1 - h) * miss;
	const noTlb = k * mem + mem;
	const bars = [
		{ l: 'Sin TLB', v: noTlb, c: 'var(--pg-bad)' },
		{ l: 'Con TLB (EAT)', v: eat, c: 'var(--sl-color-accent)' },
		{ l: 'Ideal (solo el dato)', v: mem, c: 'var(--pg-ok)' },
	];
	const max = Math.max(...bars.map((b) => b.v));
	return (
		<div className="pg not-content">
			<h4>TLB: tiempo efectivo de acceso</h4>
			<p className="pg-sub">
				Sin TLB, cada referencia cuesta <b>k accesos a la tabla + 1 al dato</b>. Con TLB:{' '}
				<Tex>{String.raw`\text{EAT} = h\,(t_{TLB} + t_m) + (1-h)\,(t_{TLB} + k\,t_m + t_m)`}</Tex>
			</p>
			<div className="pg-row">
				<label className="pg-field"><span>Hit ratio TLB h: <b>{h.toFixed(2)}</b></span><input type="range" min={0} max={1} step={0.01} value={h} onChange={(e) => setH(+e.target.value)} /></label>
				<label className="pg-field"><span>t TLB: <b>{tlb} ns</b></span><input type="range" min={0} max={20} value={tlb} onChange={(e) => setTlb(+e.target.value)} /></label>
				<label className="pg-field"><span>t memoria: <b>{mem} ns</b></span><input type="range" min={10} max={200} step={5} value={mem} onChange={(e) => setMem(+e.target.value)} /></label>
				<label className="pg-field"><span>Niveles de tabla k: <b>{k}</b></span><input type="range" min={1} max={5} value={k} onChange={(e) => setK(+e.target.value)} /></label>
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
				{bars.map((b) => (
					<div key={b.l} style={{ display: 'grid', gridTemplateColumns: '9rem 1fr 5rem', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
						<span>{b.l}</span>
						<div style={{ background: 'var(--pg-tile)', borderRadius: 8, height: 18, overflow: 'hidden' }}>
							<motion.div animate={{ width: `${(100 * b.v) / max}%` }} transition={{ type: 'spring', stiffness: 200, damping: 25 }} style={{ height: '100%', background: b.c, borderRadius: 8 }} />
						</div>
						<b className="mono">{b.v.toFixed(1)} ns</b>
					</div>
				))}
			</div>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Acierto TLB</span><span className="v">{hit} ns</span></div>
				<div className="pg-stat"><span className="k">Fallo TLB (página en RAM)</span><span className="v">{miss} ns</span></div>
				<div className="pg-stat"><span className="k">Penalización vs ideal</span><span className="v">+{(((eat - mem) / mem) * 100).toFixed(1)} %</span></div>
			</div>
			<div className="pg-note">Si la página no está en RAM (bit P = 0), hay un <b>page fault</b>: el SO bloquea al proceso, lee la página de disco (milisegundos, órdenes de magnitud más que todo lo anterior), actualiza la tabla y lo pasa a Listo.</div>
		</div>
	);
}
