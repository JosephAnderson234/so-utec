import { useState } from 'react';
import { motion } from 'motion/react';
import Tex from '../ui/Tex';

/** Tiempo medio de acceso en una memoria de dos niveles (Stallings ec. 1.1). */
export default function HitRatio() {
	const [h, setH] = useState(0.95);
	const [t1, setT1] = useState(0.1);
	const [t2, setT2] = useState(1);
	const ts = h * t1 + (1 - h) * (t1 + t2);
	const eff = t1 / ts;
	const pts = Array.from({ length: 51 }, (_, k) => {
		const H = k / 50;
		return [H, H * t1 + (1 - H) * (t1 + t2)] as const;
	});
	const maxT = t1 + t2;
	const X = (H: number) => 40 + H * 540;
	const Y = (t: number) => 170 - (t / maxT) * 150;
	return (
		<div className="pg not-content">
			<h4>Hit ratio y tiempo medio de acceso</h4>
			<p className="pg-sub">
				<Tex>{String.raw`T_s = H\,T_1 + (1-H)(T_1+T_2) = T_1 + (1-H)\,T_2`}</Tex>. Con localidad fuerte, H es alto y el sistema se comporta casi como si toda la memoria fuera rápida.
			</p>
			<div className="pg-row">
				<label className="pg-field"><span>Hit ratio H: <b>{h.toFixed(2)}</b></span><input type="range" min={0} max={1} step={0.01} value={h} onChange={(e) => setH(+e.target.value)} /></label>
				<label className="pg-field"><span>T₁ (rápida): <b>{t1} µs</b></span><input type="range" min={0.01} max={1} step={0.01} value={t1} onChange={(e) => setT1(+e.target.value)} /></label>
				<label className="pg-field"><span>T₂ (lenta): <b>{t2} µs</b></span><input type="range" min={0.1} max={10} step={0.1} value={t2} onChange={(e) => setT2(+e.target.value)} /></label>
			</div>
			<svg viewBox="0 0 600 195" role="img" aria-label="Ts en función de H">
				<line x1={40} x2={580} y1={170} y2={170} stroke="var(--pg-border)" />
				<line x1={40} x2={40} y1={15} y2={170} stroke="var(--pg-border)" />
				<polyline className="chart-line" pathLength={1} fill="none" stroke="var(--sl-color-accent)" strokeWidth={2.5} points={pts.map(([H, t]) => `${X(H)},${Y(t)}`).join(' ')} />
				<line x1={40} x2={580} y1={Y(t1)} y2={Y(t1)} stroke="var(--pg-ok)" strokeDasharray="4 4" />
				<text x={582} y={Y(t1) + 4} fontSize={10} textAnchor="end">T₁</text>
				<motion.circle r={6} fill="var(--pg-violet)" animate={{ cx: X(h), cy: Y(ts) }} transition={{ type: 'spring', stiffness: 300, damping: 25 }} />
				<text x={40} y={188} fontSize={10}>H = 0</text>
				<text x={580} y={188} fontSize={10} textAnchor="end">H = 1</text>
			</svg>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Tₛ (tiempo medio)</span><span className="v">{ts.toFixed(3)} µs</span></div>
				<div className="pg-stat"><span className="k">Eficiencia T₁/Tₛ</span><span className="v">{(eff * 100).toFixed(1)} %</span></div>
				<div className="pg-stat"><span className="k">Accesos que van a M₂</span><span className="v">{((1 - h) * 100).toFixed(0)} %</span></div>
			</div>
			<div className="pg-note">Ejemplo del libro: T₁ = 0.1 µs, T₂ = 1 µs, H = 0.95 → Tₛ = 0.15 µs. La misma idea sostiene a la caché (L1/L2/RAM), al TLB y a la memoria virtual (RAM/disco): todo funciona gracias a la <b>localidad de referencia</b>.</div>
		</div>
	);
}
