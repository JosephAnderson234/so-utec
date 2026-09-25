import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const SEGS = [
	{ id: 0, name: 'code', base: 0x4000, limit: 0x0800 },
	{ id: 1, name: 'data', base: 0x4800, limit: 0x1400 },
	{ id: 2, name: 'shared', base: 0xf000, limit: 0x1000 },
	{ id: 3, name: 'stack', base: 0x0000, limit: 0x3000 },
];
const hex = (n: number, w = 4) => '0x' + n.toString(16).toUpperCase().padStart(w, '0');
const EXAMPLES = [
	{ a: 0x0240, d: 'fetch de main (la $a0, varx)' },
	{ a: 0x0244, d: 'fetch de jal strlen' },
	{ a: 0x0360, d: 'fetch en strlen' },
	{ a: 0x4050, d: 'lb $t0, ($a0): dato varx' },
	{ a: 0x8010, d: 'segmento compartido' },
	{ a: 0x0900, d: '¿fuera del límite?' },
];

export default function SegmentTranslator() {
	const [txt, setTxt] = useState('0x4050');
	const parsed = parseInt(txt.replace(/^0x/i, ''), 16);
	const valid = Number.isFinite(parsed) && parsed >= 0 && parsed <= 0xffff;
	const va = valid ? parsed : 0;
	const seg = va >> 14;
	const off = va & 0x3fff;
	const s = SEGS[seg];
	const ok = off < s.limit;
	const bits = va.toString(2).padStart(16, '0');

	return (
		<div className="pg not-content">
			<h4>Traducción con segmentación (dirección de 16 bits)</h4>
			<p className="pg-sub">Los 2 bits altos eligen el segmento y los 14 bajos son el offset. La MMU comprueba <code>offset &lt; limit</code> y calcula <code>física = base + offset</code>. Es la tabla de la diapositiva 37.</p>
			<div className="pg-row">
				<label className="pg-field" style={{ maxWidth: '12rem' }}>
					<span>Dirección virtual (hex)</span>
					<input type="text" value={txt} onChange={(e) => setTxt(e.target.value)} />
				</label>
				<div className="pg-seg">
					{EXAMPLES.map((e) => (
						<button key={e.a} onClick={() => setTxt(hex(e.a))} title={e.d}>
							{hex(e.a)}
						</button>
					))}
				</div>
			</div>
			{!valid && <div className="pg-note bad">Ingresa un valor hexadecimal entre 0x0000 y 0xFFFF.</div>}
			<div className="bits" style={{ fontSize: '0.85rem' }}>
				{bits.split('').map((b, k) => (
					<motion.div key={k + b} initial={{ rotateX: 90 }} animate={{ rotateX: 0 }} transition={{ delay: k * 0.015 }} style={{ flex: 1, minWidth: 0, background: k < 2 ? 'var(--sl-color-accent)' : 'var(--pg-c1)' }}>
						{b}
					</motion.div>
				))}
			</div>
			<div className="pg-row" style={{ fontSize: '0.8rem', color: 'var(--pg-muted)', marginTop: '-0.6rem !important' }}>
				<span>segmento = {bits.slice(0, 2)}₂ = <b>{seg}</b></span>
				<span>offset = {hex(off)}</span>
			</div>
			<div className="pg-scroll">
				<table>
					<thead>
						<tr><th>Seg</th><th>Nombre</th><th>Base</th><th>Límite</th></tr>
					</thead>
					<tbody>
						{SEGS.map((x) => (
							<motion.tr key={x.id} animate={{ backgroundColor: x.id === seg ? 'color-mix(in srgb, var(--sl-color-accent) 18%, transparent)' : 'rgba(0,0,0,0)' }}>
								<td>{x.id}</td><td>{x.name}</td><td className="mono">{hex(x.base)}</td><td className="mono">{hex(x.limit)}</td>
							</motion.tr>
						))}
					</tbody>
				</table>
			</div>
			<AnimatePresence mode="wait">
				<motion.div key={va} className={`pg-note ${ok ? 'ok' : 'bad'}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
					{ok ? (
						<>
							offset {hex(off)} &lt; límite {hex(s.limit)} ✔ → física = {hex(s.base)} + {hex(off)} = <b className="mono">{hex(s.base + off, 4)}</b>
						</>
					) : (
						<>
							offset {hex(off)} ≥ límite {hex(s.limit)} ✘ → <b>excepción (segmentation fault)</b>: el SO recibe la trampa y normalmente mata al proceso.
						</>
					)}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
