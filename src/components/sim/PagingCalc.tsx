import { useState } from 'react';
import { motion } from 'motion/react';
import Tex from '../ui/Tex';

const UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'];
/** 2^e bytes (× mult) en la unidad más legible */
function bytes(e: number, mult = 1) {
	let u = Math.min(Math.floor(e / 10), UNITS.length - 1);
	if (u < 0) u = 0;
	const val = mult * 2 ** (e - 10 * u);
	return `${Number.isInteger(val) ? val : val.toFixed(2)} ${UNITS[u]}`;
}
const pow = (e: number) => <Tex>{`2^{${e}}`}</Tex>;

const PRESETS = {
	e25: { name: 'E1 2025-2 (2⁵⁰ B, 2 GiB, 4 KiB, V+D)', va: 50, pa: 31, pg: 12, extra: 2, pte: 4, levels: false },
	e22: { name: 'E1 2022 (38 bits, 32 bits, 16 KB, PTE 4 B, 2 niveles)', va: 38, pa: 32, pg: 14, extra: 0, pte: 4, levels: true },
	x86: { name: 'x86-64 típico (48 bits, 4 KiB, PTE 8 B)', va: 48, pa: 40, pg: 12, extra: 12, pte: 8, levels: true },
};

export default function PagingCalc() {
	const [va, setVa] = useState(50);
	const [pa, setPa] = useState(31);
	const [pg, setPg] = useState(12);
	const [extra, setExtra] = useState(2);
	const [pte, setPte] = useState(4);
	const [ml, setMl] = useState(false);
	const load = (k: keyof typeof PRESETS) => {
		const p = PRESETS[k];
		setVa(p.va); setPa(p.pa); setPg(p.pg); setExtra(p.extra); setPte(p.pte); setMl(p.levels);
	};

	const vpn = va - pg;
	const pfn = Math.max(0, pa - pg);
	const pteBits = pfn + extra;
	const pteBytes = Math.ceil(pteBits / 8);
	// multinivel con PTE de tamaño fijo `pte` bytes
	const perPage = pg - Math.log2(pte); // bits de índice por nivel (una tabla ocupa 1 página)
	const nLevels = Math.ceil(vpn / perPage);
	const top = vpn - perPage * (nLevels - 1);

	const Stat = ({ k, v, sub }: { k: string; v: React.ReactNode; sub?: React.ReactNode }) => (
		<motion.div className="pg-stat" layout>
			<span className="k">{k}</span>
			<span className="v">{v}</span>
			{sub && <span className="k" style={{ marginTop: 4 }}>{sub}</span>}
		</motion.div>
	);

	const Bar = ({ parts }: { parts: { label: string; bits: number; color: string }[] }) => {
		const tot = parts.reduce((a, b) => a + b.bits, 0);
		return (
			<div className="bits">
				{parts.map((p, k) => (
					<motion.div key={k} layout style={{ flex: `${p.bits} 1 0`, background: p.color }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
						{p.label} · {p.bits}b
					</motion.div>
				))}
				<span style={{ display: 'none' }}>{tot}</span>
			</div>
		);
	};

	return (
		<div className="pg not-content">
			<h4>Calculadora de paginación</h4>
			<p className="pg-sub">Mueve los parámetros o carga un examen. Todo se deriva de tres logaritmos: bits de dirección virtual, bits físicos y bits de offset.</p>
			<div className="pg-seg">
				{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
					<button key={k} onClick={() => load(k)}>{PRESETS[k].name}</button>
				))}
			</div>
			<div className="pg-row">
				<label className="pg-field"><span>Dir. virtual: <b>{va} bits</b> ({bytes(va)})</span><input type="range" min={16} max={64} value={va} onChange={(e) => setVa(+e.target.value)} /></label>
				<label className="pg-field"><span>Memoria física: <b>{bytes(pa)}</b> ({pa} bits)</span><input type="range" min={16} max={52} value={pa} onChange={(e) => setPa(+e.target.value)} /></label>
				<label className="pg-field"><span>Página: <b>{bytes(pg)}</b> ({pg} bits)</span><input type="range" min={9} max={21} value={pg} onChange={(e) => setPg(+e.target.value)} /></label>
				<label className="pg-field"><span>Bits de estado por PTE: <b>{extra}</b></span><input type="range" min={0} max={16} value={extra} onChange={(e) => setExtra(+e.target.value)} /></label>
			</div>

			<div>
				<span className="lane-label">Dirección virtual ({va} bits)</span>
				<Bar parts={[{ label: 'VPN', bits: vpn, color: 'var(--sl-color-accent)' }, { label: 'offset', bits: pg, color: 'var(--pg-c1)' }]} />
			</div>
			<div>
				<span className="lane-label">Dirección física ({pa} bits)</span>
				<Bar parts={[{ label: 'PFN', bits: pfn, color: 'var(--pg-violet)' }, { label: 'offset', bits: pg, color: 'var(--pg-c1)' }]} />
			</div>
			<div>
				<span className="lane-label">Entrada de la tabla (PTE): {pteBits} bits → {pteBytes} B</span>
				<Bar
					parts={[
						...(extra ? [{ label: 'estado', bits: extra, color: 'var(--pg-c6)' }] : []),
						{ label: 'PFN', bits: pfn, color: 'var(--pg-violet)' },
						...(pteBytes * 8 - pteBits ? [{ label: 'pad', bits: pteBytes * 8 - pteBits, color: 'var(--pg-surface-2)' }] : []),
					]}
				/>
			</div>

			<div className="pg-stats">
				<Stat k="(a) bits dir. física" v={pa} sub={<>log₂({bytes(pa)})</>} />
				<Stat k="(b) páginas virtuales" v={pow(vpn)} sub={<>{pow(va)} / {pow(pg)}</>} />
				<Stat k="(c) marcos físicos" v={pow(pfn)} sub={<>{pow(pa)} / {pow(pg)}</>} />
				<Stat k="(d) bits VPN / PFN" v={`${vpn} / ${pfn}`} />
				<Stat k="(e) entradas de la tabla" v={pow(vpn)} sub="una por página virtual" />
				<Stat k="(f) bytes por PTE" v={`${pteBytes} B`} sub={`⌈(${pfn} + ${extra}) / 8⌉`} />
				<Stat k="(g) tamaño de la tabla" v={bytes(vpn, pteBytes)} sub={<><Tex>{`2^{${vpn}} \\times ${pteBytes}\\,\\text{B}`}</Tex></>} />
			</div>

			<label style={{ margin: 0 }}>
				<input type="checkbox" checked={ml} onChange={(e) => setMl(e.target.checked)} /> Tabla multinivel (cada tabla ocupa exactamente 1 página)
			</label>
			{ml && (
				<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
					<label className="pg-field" style={{ maxWidth: '16rem' }}>
						<span>Tamaño de PTE: <b>{pte} B</b></span>
						<input type="range" min={2} max={3} step={1} value={Math.log2(pte)} onChange={(e) => setPte(2 ** +e.target.value)} />
					</label>
					<div>
						<span className="lane-label">VPN partida en {nLevels} niveles</span>
						<Bar
							parts={[
								...Array.from({ length: nLevels }, (_, k) => ({ label: `L${k + 1}`, bits: k === 0 ? top : perPage, color: `hsl(${36 + k * 55}, 80%, 65%)` })),
								{ label: 'offset', bits: pg, color: 'var(--pg-c1)' },
							]}
						/>
					</div>
					<div className="pg-stats">
						<Stat k="PTEs por página" v={pow(perPage)} sub={<>{bytes(pg)} / {pte} B</>} />
						<Stat k="Niveles" v={nLevels} sub={<>⌈{vpn} / {perPage}⌉</>} />
						<Stat k="Tabla raíz" v={bytes(top + Math.log2(pte))} sub={<><Tex>{`2^{${top}} \\times ${pte}`}</Tex></>} />
						<Stat k="1 nivel equivalente" v={bytes(vpn + Math.log2(pte))} sub={<><Tex>{`2^{${vpn}} \\times ${pte}`}</Tex> siempre</>} />
						<Stat k="Mínimo multinivel" v={bytes(pg, nLevels)} sub="1 tabla por nivel (proceso pequeño)" />
					</div>
					<div className="pg-note">
						Ventaja: solo se crean las tablas de segundo nivel que se usan, así que un proceso pequeño ocupa {nLevels} página(s) de tablas en vez de {bytes(vpn + Math.log2(pte))}. Desventaja: una traducción cuesta {nLevels} accesos a memoria más (el TLB lo mitiga).
					</div>
				</motion.div>
			)}
		</div>
	);
}
