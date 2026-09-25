import { useState } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

type Kind = 'R' | 'W';
type St = 'esperando' | 'listo' | 'activo' | 'hecho';
type T = { id: number; kind: Kind; st: St };
type Policy = 'lectores' | 'escritores';

export default function RWMonitor() {
	const [ts, setTs] = useState<T[]>([]);
	const [mesa, setMesa] = useState(true);
	const [pol, setPol] = useState<Policy>('lectores');
	const [log, setLog] = useState<string[]>([]);
	const [bypass, setBypass] = useState(0);

	const nr = ts.filter((t) => t.kind === 'R' && t.st === 'activo').length;
	const nw = ts.filter((t) => t.kind === 'W' && t.st === 'activo').length;
	const ww = ts.filter((t) => t.kind === 'W' && (t.st === 'esperando' || t.st === 'listo')).length;
	const name = (t: T) => `${t.kind === 'R' ? 'L' : 'E'}${t.id}`;

	const canRead = (list: T[]) => {
		const w = list.filter((t) => t.kind === 'W' && t.st === 'activo').length;
		const wwait = list.filter((t) => t.kind === 'W' && (t.st === 'esperando' || t.st === 'listo')).length;
		return w === 0 && (pol === 'lectores' || wwait === 0);
	};
	const canWrite = (list: T[]) => !list.some((t) => t.st === 'activo');

	const add = (m: string) => setLog((l) => [...l.slice(-7), m]);

	/** Despierta hilos de la cola de una condición (Mesa: pasan a «listo»; Hoare: entran de inmediato). */
	const wake = (list: T[], kind: Kind, all: boolean, msgs: string[]) => {
		const waiting = list.filter((t) => t.kind === kind && t.st === 'esperando');
		const chosen = all ? waiting : waiting.slice(0, 1);
		for (const t of chosen) {
			if (mesa) {
				t.st = 'listo';
				msgs.push(`${all ? 'broadcast' : 'signal'}(${kind === 'R' ? 'cond_rd' : 'cond_wr'}) → ${name(t)} pasa a listo; debe re-evaluar su while`);
			} else if (kind === 'R' ? canRead(list) : canWrite(list)) {
				t.st = 'activo';
				msgs.push(`Hoare: ${name(t)} recibe el monitor y entra de inmediato`);
			}
		}
	};

	const arrive = (kind: Kind) => {
		const list = ts.map((t) => ({ ...t }));
		const id = list.length + 1;
		const t: T = { id, kind, st: 'esperando' };
		const ok = kind === 'R' ? canRead(list) : canWrite(list);
		if (ok) {
			t.st = 'activo';
			if (kind === 'R' && list.some((x) => x.kind === 'W' && x.st !== 'hecho' && x.st !== 'activo')) setBypass((b) => b + 1);
		}
		list.push(t);
		setTs(list);
		add(`${name(t)} llega → ${ok ? 'entra' : `wait(${kind === 'R' ? 'cond_rd' : 'cond_wr'})`}`);
	};

	const finish = (id: number) => {
		const list = ts.map((t) => ({ ...t }));
		const t = list.find((x) => x.id === id)!;
		t.st = 'hecho';
		const msgs = [`${name(t)} sale`];
		if (t.kind === 'R') {
			if (!list.some((x) => x.kind === 'R' && x.st === 'activo')) wake(list, 'W', false, msgs);
		} else if (pol === 'lectores') {
			wake(list, 'W', false, msgs);
			wake(list, 'R', true, msgs);
		} else if (list.some((x) => x.kind === 'W' && x.st === 'esperando')) wake(list, 'W', false, msgs);
		else wake(list, 'R', true, msgs);
		setTs(list);
		msgs.forEach(add);
	};

	const reeval = (id: number) => {
		const list = ts.map((t) => ({ ...t }));
		const t = list.find((x) => x.id === id)!;
		const ok = t.kind === 'R' ? canRead(list) : canWrite(list);
		t.st = ok ? 'activo' : 'esperando';
		setTs(list);
		add(`${name(t)} readquiere el lock y re-evalúa: ${ok ? 'condición OK → entra' : 'la condición YA NO se cumple → vuelve a esperar (por eso es while y no if)'}`);
	};

	const reset = () => {
		setTs([]);
		setLog([]);
		setBypass(0);
	};

	const Lane = ({ title, st }: { title: string; st: St }) => (
		<div>
			<span className="lane-label">{title}</span>
			<div className="lane">
				<AnimatePresence>
					{ts
						.filter((t) => t.st === st)
						.map((t) => (
							<motion.button
								key={t.id}
								layoutId={`t${t.id}`}
								className={`sim-proc ${st === 'activo' ? 'cs' : st === 'listo' ? 'run' : ''}`}
								onClick={() => (st === 'activo' ? finish(t.id) : st === 'listo' ? reeval(t.id) : undefined)}
								style={{ cursor: st === 'activo' || st === 'listo' ? 'pointer' : 'default', color: t.kind === 'W' ? 'var(--pg-violet)' : 'var(--sl-color-accent-high)' }}
								initial={{ opacity: 0, scale: 0.6 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.6 }}
								transition={{ type: 'spring', stiffness: 420, damping: 30 }}
							>
								{t.kind === 'R' ? '📖' : '✍️'} {name(t)}
							</motion.button>
						))}
				</AnimatePresence>
			</div>
		</div>
	);

	return (
		<div className="pg not-content">
			<h4>Monitor lectores–escritores</h4>
			<p className="pg-sub">Agrega hilos. Clic en un hilo <b>activo</b> para que salga. En modo Mesa, los despertados quedan en <b>listo</b>: haz clic para que readquieran el lock y re-evalúen su <code>while</code>.</p>
			<div className="pg-row">
				<div className="pg-seg">
					<button className={mesa ? 'active' : ''} onClick={() => setMesa(true)}>Mesa (pthreads)</button>
					<button className={!mesa ? 'active' : ''} onClick={() => setMesa(false)}>Hoare</button>
				</div>
				<div className="pg-seg">
					<button className={pol === 'lectores' ? 'active' : ''} onClick={() => setPol('lectores')}>Preferencia lectores (diap. 21–22)</button>
					<button className={pol === 'escritores' ? 'active' : ''} onClick={() => setPol('escritores')}>Preferencia escritores</button>
				</div>
			</div>
			<div className="pg-row">
				<button className="primary" onClick={() => arrive('R')}>+ Lector</button>
				<button className="primary" style={{ background: 'var(--pg-violet)' }} onClick={() => arrive('W')}>+ Escritor</button>
				<button onClick={reset}>Reiniciar</button>
			</div>
			<LayoutGroup>
				<div className="pg-grid-2">
					<Lane title="Esperando en cond_rd / cond_wr" st="esperando" />
					<Lane title="Listos (despertados, sin el lock)" st="listo" />
				</div>
				<Lane title="Dentro (datos compartidos)" st="activo" />
			</LayoutGroup>
			<div className="pg-stats">
				<div className="pg-stat"><span className="k mono">nr (lectores activos)</span><span className="v">{nr}</span></div>
				<div className="pg-stat"><span className="k mono">nw (escritores activos)</span><span className="v">{nw}</span></div>
				<div className="pg-stat"><span className="k">escritores esperando</span><span className="v">{ww}</span></div>
				<div className="pg-stat"><span className="k">lectores que adelantaron a un escritor</span><span className="v" style={{ color: bypass ? 'var(--pg-bad)' : undefined }}>{bypass}</span></div>
			</div>
			{nw > 0 && nr > 0 && <div className="pg-note bad">Violación: lector y escritor juntos.</div>}
			<div className="lane" style={{ alignItems: 'flex-start', fontSize: '0.75rem' }}>
				{log.length ? log.map((l, k) => <span key={k} className="sim-proc">{l}</span>) : <span style={{ color: 'var(--pg-muted)' }}>Prueba: +Lector, +Escritor, +Lector, +Lector… con preferencia de lectores, el escritor puede esperar para siempre.</span>}
			</div>
		</div>
	);
}
