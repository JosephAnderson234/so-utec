import { useState } from 'react';
import { motion } from 'motion/react';
import Tex from '../ui/Tex';

/** Ley de Amdahl (Stallings §4.3, fig. 4.7a) con overhead opcional por procesador (fig. 4.7b). */
export default function Amdahl() {
	const [f, setF] = useState(0.9);
	const [n, setN] = useState(8);
	const [ov, setOv] = useState(0);
	const sp = (N: number) => 1 / (1 - f + f / N + ov * (N - 1));
	const maxN = 32;
	const pts = Array.from({ length: maxN }, (_, k) => [k + 1, sp(k + 1)] as const);
	const top = Math.max(2, Math.min(maxN, Math.max(...pts.map((p) => p[1])) * 1.15));
	const X = (N: number) => 40 + ((N - 1) / (maxN - 1)) * 540;
	const Y = (s: number) => 170 - (Math.min(s, top) / top) * 150;
	return (
		<div className="pg not-content">
			<h4>Ley de Amdahl</h4>
			<p className="pg-sub">
				<Tex>{String.raw`\text{Speedup}(N) = \dfrac{1}{(1-f) + f/N}`}</Tex>, donde f es la fracción paralelizable. El código serial acota la ganancia a <Tex>{String.raw`1/(1-f)`}</Tex> aunque haya infinitos núcleos.
			</p>
			<div className="pg-row">
				<label className="pg-field"><span>Fracción paralela f: <b>{f.toFixed(2)}</b></span><input type="range" min={0} max={1} step={0.01} value={f} onChange={(e) => setF(+e.target.value)} /></label>
				<label className="pg-field"><span>Núcleos N: <b>{n}</b></span><input type="range" min={1} max={maxN} value={n} onChange={(e) => setN(+e.target.value)} /></label>
				<label className="pg-field"><span>Overhead por núcleo: <b>{(ov * 100).toFixed(1)} %</b></span><input type="range" min={0} max={0.03} step={0.001} value={ov} onChange={(e) => setOv(+e.target.value)} /></label>
			</div>
			<svg viewBox="0 0 600 195" role="img" aria-label="speedup vs núcleos">
				<line x1={40} x2={580} y1={170} y2={170} stroke="var(--pg-border)" />
				<line x1={40} x2={40} y1={15} y2={170} stroke="var(--pg-border)" />
				<polyline fill="none" stroke="var(--pg-border)" strokeDasharray="4 4" points={pts.map(([N]) => `${X(N)},${Y(Math.min(N, top))}`).join(' ')} />
				<polyline fill="none" stroke="var(--sl-color-accent)" strokeWidth={2.5} points={pts.map(([N, s]) => `${X(N)},${Y(s)}`).join(' ')} />
				<motion.circle r={6} fill="var(--pg-violet)" animate={{ cx: X(n), cy: Y(sp(n)) }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} />
				<text x={44} y={24} fontSize={10}>speedup (máx. del eje {top.toFixed(1)})</text>
				<text x={580} y={188} fontSize={10} textAnchor="end">N = {maxN}</text>
				<text x={X(12)} y={Y(12) - 6} fontSize={10}>ideal (lineal)</text>
			</svg>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k">Speedup con N = {n}</span><span className="v">{sp(n).toFixed(2)}×</span></div>
				<div className="pg-stat"><span className="k">Eficiencia (speedup / N)</span><span className="v">{((sp(n) / n) * 100).toFixed(0)} %</span></div>
				<div className="pg-stat"><span className="k">Techo 1/(1−f)</span><span className="v">{f >= 1 ? '∞' : (1 / (1 - f)).toFixed(1) + '×'}</span></div>
			</div>
			<div className="pg-note">Ejemplo del libro: 10 % serial (f = 0.9) con 8 núcleos da solo <b>4.7×</b>. Con overhead de comunicación o coherencia de caché (fig. 4.7b), la curva llega a un <b>pico y luego baja</b>.</div>
		</div>
	);
}
