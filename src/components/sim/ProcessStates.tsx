import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type S = { id: string; label: string; x: number; y: number; desc: string };
type T = { from: string; to: string; label: string; why: string; curve?: number; ldx?: number };
type Model = { name: string; start: string; states: S[]; trans: T[]; w: number; h: number; nota: string };

const FIVE: Model = {
	name: '5 estados (Stallings fig. 3.6)',
	start: 'New',
	w: 640,
	h: 270,
	states: [
		{ id: 'New', label: 'New', x: 60, y: 60, desc: 'Recién creado: el SO ya armó su PCB y tablas, pero todavía no lo admite al pool de ejecutables (normalmente su código aún está en disco).' },
		{ id: 'Ready', label: 'Ready', x: 230, y: 60, desc: 'Listo: tiene todo menos la CPU. Espera en la cola de listos (a veces una cola por prioridad).' },
		{ id: 'Running', label: 'Running', x: 410, y: 60, desc: 'En ejecución. Con una sola CPU, a lo sumo UN proceso está aquí.' },
		{ id: 'Exit', label: 'Exit', x: 580, y: 60, desc: 'Terminado: ya no es elegible, pero sus tablas se conservan un tiempo para que la contabilidad o el padre extraigan información.' },
		{ id: 'Blocked', label: 'Blocked', x: 320, y: 235, desc: 'Bloqueado o waiting: espera un evento (fin de E/S, un mensaje, un recurso). Lo ideal es una cola por evento.' },
	],
	trans: [
		{ from: 'New', to: 'Ready', label: 'Admit', why: 'El SO acepta un proceso más (limita cuántos admite según la memoria y el rendimiento).' },
		{ from: 'Ready', to: 'Running', label: 'Dispatch', why: 'El dispatcher (planificador de corto plazo) elige este proceso.' },
		{ from: 'Running', to: 'Ready', label: 'Time-out', why: 'Se agotó el quantum, lo expropió uno de mayor prioridad (preemption) o cedió la CPU voluntariamente.' },
		{ from: 'Running', to: 'Blocked', label: 'Event wait', why: 'Pidió algo por lo que debe esperar: una E/S, un recurso no disponible o un mensaje de otro proceso (normalmente con una system call).', ldx: 34 },
		{ from: 'Blocked', to: 'Ready', label: 'Event occurs', why: 'Ocurrió el evento que esperaba. NUNCA pasa directo a Running.', ldx: -36 },
		{ from: 'Running', to: 'Exit', label: 'Release', why: 'Terminó normalmente (exit) o abortó (tabla 3.2: violación de límites, error aritmético, instrucción privilegiada…).' },
		{ from: 'Ready', to: 'Exit', label: 'kill del padre', why: 'Transición no dibujada en la figura: el padre puede terminar al hijo en cualquier estado.', curve: -52 },
		{ from: 'Blocked', to: 'Exit', label: 'kill del padre', why: 'Ídem: terminación por el padre o terminación en cascada.' },
	],
	nota: 'Blocked → Running NO existe: al ocurrir el evento, el proceso vuelve a Ready y compite de nuevo por la CPU.',
};

const SEVEN: Model = {
	name: '7 estados con suspendidos (fig. 3.9b)',
	start: 'New',
	w: 660,
	h: 330,
	states: [
		{ id: 'New', label: 'New', x: 60, y: 165, desc: 'Recién creado. Puede admitirse a Ready (hay memoria) o a Ready/Suspend (no hay memoria).' },
		{ id: 'Ready', label: 'Ready', x: 250, y: 60, desc: 'En memoria principal y listo para ejecutar.' },
		{ id: 'Running', label: 'Running', x: 440, y: 60, desc: 'En ejecución.' },
		{ id: 'Exit', label: 'Exit', x: 610, y: 60, desc: 'Terminado.' },
		{ id: 'Blocked', label: 'Blocked', x: 440, y: 190, desc: 'En memoria principal, esperando un evento.' },
		{ id: 'ReadyS', label: 'Ready/Susp', x: 250, y: 280, desc: 'En DISCO pero listo: basta con traerlo a memoria (swap in).' },
		{ id: 'BlockedS', label: 'Blocked/Susp', x: 470, y: 290, desc: 'En DISCO y además esperando un evento.' },
	],
	trans: [
		{ from: 'New', to: 'Ready', label: 'Admit', why: 'Hay memoria disponible.' },
		{ from: 'New', to: 'ReadyS', label: 'Admit', why: 'Se crea el PCB, pero no hay memoria: queda en disco (útil para tener un pool grande de procesos no bloqueados).' },
		{ from: 'Ready', to: 'Running', label: 'Dispatch', why: 'Lo elige el dispatcher.' },
		{ from: 'Running', to: 'Ready', label: 'Time-out', why: 'Quantum agotado o preemption.' },
		{ from: 'Running', to: 'Blocked', label: 'Event wait', why: 'Espera E/S u otro evento.' },
		{ from: 'Running', to: 'ReadyS', label: 'Suspend', why: 'Se expropia porque se desbloqueó uno de mayor prioridad que está en disco, y de paso se libera memoria.' },
		{ from: 'Running', to: 'Exit', label: 'Release', why: 'Termina.' },
		{ from: 'Blocked', to: 'Ready', label: 'Event occurs', why: 'Llega el evento.' },
		{ from: 'Blocked', to: 'BlockedS', label: 'Suspend', why: 'Swap out: todos los procesos en memoria están bloqueados y conviene hacer espacio para uno ejecutable. Es la suspensión más común.' },
		{ from: 'BlockedS', to: 'ReadyS', label: 'Event occurs', why: 'El evento ocurre mientras está en disco: queda listo, pero sigue fuera de memoria.' },
		{ from: 'BlockedS', to: 'Blocked', label: 'Activate', why: 'Poco común: sale uno de memoria y este tiene alta prioridad y su evento está por ocurrir.' },
		{ from: 'ReadyS', to: 'Ready', label: 'Activate', why: 'No hay listos en memoria, o este tiene más prioridad que los que están en Ready.' },
		{ from: 'Ready', to: 'ReadyS', label: 'Suspend', why: 'Solo si es la única forma de liberar un bloque grande, o para suspender uno de baja prioridad antes que un bloqueado de alta prioridad.' },
	],
	nota: 'Suspendido = no disponible de inmediato + (quizá) esperando un evento + lo puso ahí un agente (él mismo, su padre o el SO) + solo sale cuando ese agente lo ordena. Razones: swapping, otra razón del SO, pedido del usuario (depuración), timing o pedido del padre.',
};

const UNIX: Model = {
	name: 'UNIX SVR4 (9 estados, fig. 3.17)',
	start: 'Created',
	w: 680,
	h: 360,
	states: [
		{ id: 'Created', label: 'Created', x: 70, y: 180, desc: 'Recién creado por fork; todavía no está listo.' },
		{ id: 'ReadyMem', label: 'Ready, in mem', x: 270, y: 180, desc: 'Listo en memoria. Para el despacho, comparte UNA sola cola con Preempted.' },
		{ id: 'ReadySw', label: 'Ready, swapped', x: 270, y: 320, desc: 'Listo, pero el swapper (proceso 0) debe traerlo a memoria.' },
		{ id: 'Kernel', label: 'Kernel running', x: 470, y: 180, desc: 'Ejecutando código del kernel en el contexto de ESTE proceso (syscall, interrupción o fault).' },
		{ id: 'User', label: 'User running', x: 470, y: 50, desc: 'Ejecutando su programa en modo usuario.' },
		{ id: 'Preempted', label: 'Preempted', x: 270, y: 50, desc: 'Iba a volver a modo usuario y el kernel lo expropió. Es el mismo estado que Ready, in mem, solo que se entra de otra forma.' },
		{ id: 'Asleep', label: 'Asleep in mem', x: 610, y: 250, desc: 'Bloqueado (dormido) en memoria.' },
		{ id: 'SleepSw', label: 'Sleep, swapped', x: 470, y: 320, desc: 'Bloqueado y en disco.' },
		{ id: 'Zombie', label: 'Zombie', x: 620, y: 110, desc: 'Ya no existe, pero deja su registro (estado de salida) hasta que el padre haga wait().' },
	],
	trans: [
		{ from: 'Created', to: 'ReadyMem', label: 'enough mem', why: 'Hay memoria suficiente.' },
		{ from: 'Created', to: 'ReadySw', label: 'not enough', why: 'No hay memoria (solo en sistemas con swapping).' },
		{ from: 'ReadyMem', to: 'Kernel', label: 'reschedule', why: 'El planificador lo elige; al despertar ejecuta primero en modo kernel.' },
		{ from: 'Kernel', to: 'User', label: 'return', why: 'Vuelve a modo usuario.' },
		{ from: 'User', to: 'Kernel', label: 'syscall / interrupt', why: 'Entra al kernel por una system call, una interrupción o un fault. Es un cambio de MODO, no de proceso.' },
		{ from: 'Kernel', to: 'Preempted', label: 'preempt', why: 'Al volver a modo usuario, el kernel decide darle la CPU a uno de mayor prioridad. SOLO puede ocurrir en este punto: en modo kernel no hay preemption, por eso UNIX clásico no sirve para tiempo real.' },
		{ from: 'Preempted', to: 'User', label: 'return to user', why: 'Lo vuelven a planificar.' },
		{ from: 'Kernel', to: 'Asleep', label: 'sleep', why: 'Espera un evento.' },
		{ from: 'Asleep', to: 'ReadyMem', label: 'wakeup', why: 'Ocurre el evento.' },
		{ from: 'Asleep', to: 'SleepSw', label: 'swap out', why: 'El swapper lo lleva a disco.' },
		{ from: 'SleepSw', to: 'ReadySw', label: 'wakeup', why: 'El evento ocurre estando en disco.' },
		{ from: 'ReadyMem', to: 'ReadySw', label: 'swap out', why: 'Se libera memoria.' },
		{ from: 'ReadySw', to: 'ReadyMem', label: 'swap in', why: 'El proceso 0 (swapper) lo trae de vuelta.' },
		{ from: 'Kernel', to: 'Zombie', label: 'exit', why: 'Termina; queda como zombie hasta que el padre haga wait().' },
	],
	nota: 'El proceso 0 es el swapper (se crea en el boot) y crea al proceso 1 (init/systemd), ancestro de todos los demás. Hay DOS estados Running porque UNIX ejecuta el kernel dentro del contexto del proceso (fig. 3.15b).',
};

const LINUX: Model = {
	name: 'Linux (task_struct->state)',
	start: 'Ready',
	w: 640,
	h: 280,
	states: [
		{ id: 'Ready', label: 'RUNNING (ready)', x: 110, y: 70, desc: 'TASK_RUNNING en una runqueue: ejecutable, esperando CPU. Linux no distingue listo de ejecutando en el campo state.' },
		{ id: 'Run', label: 'RUNNING (cpu)', x: 400, y: 70, desc: 'TASK_RUNNING y con la CPU.' },
		{ id: 'Int', label: 'INTERRUPTIBLE', x: 110, y: 220, desc: 'Dormido en una wait queue. Despierta cuando se cumple la condición O al recibir una señal.' },
		{ id: 'Unint', label: 'UNINTERRUPTIBLE', x: 330, y: 220, desc: 'Dormido e IGNORA las señales (por ejemplo, E/S de disco en curso). Es el estado «D» de ps.' },
		{ id: 'Stopped', label: 'STOPPED', x: 560, y: 220, desc: 'Detenido por SIGSTOP, SIGTSTP, SIGTTIN o SIGTTOU, o mientras lo depuran. Solo sale con SIGCONT.' },
		{ id: 'Zombie', label: 'ZOMBIE', x: 580, y: 70, desc: 'Terminó (do_exit) y espera que el padre haga wait4(); solo queda el descriptor.' },
	],
	trans: [
		{ from: 'Ready', to: 'Run', label: 'schedule()', why: 'schedule() llama a context_switch().' },
		{ from: 'Run', to: 'Ready', label: 'preempt', why: 'Se expropia (quantum o prioridad).' },
		{ from: 'Run', to: 'Int', label: 'sleep', why: 'Duerme en una wait queue.', ldx: 20 },
		{ from: 'Run', to: 'Unint', label: 'sleep (D)', why: 'Duerme sin poder ser interrumpido por señales.', ldx: 8 },
		{ from: 'Int', to: 'Ready', label: 'evento / señal', why: 'Se cumple la condición o llega una señal.' },
		{ from: 'Unint', to: 'Ready', label: 'evento', why: 'Solo el evento lo despierta.', ldx: -24 },
		{ from: 'Run', to: 'Stopped', label: 'SIGSTOP', why: 'Señal de parada.' },
		{ from: 'Stopped', to: 'Ready', label: 'SIGCONT', why: 'Reanudación.', ldx: 70 },
		{ from: 'Run', to: 'Zombie', label: 'do_exit()', why: 'Termina.' },
	],
	nota: 'Para Linux un hilo es solo un proceso que comparte recursos (clone con CLONE_VM, CLONE_FS, CLONE_FILES, CLONE_SIGHAND). Todos tienen su task_struct en una lista circular doblemente enlazada.',
};

const MODELS = [FIVE, SEVEN, UNIX, LINUX];

export default function ProcessStates() {
	const [mi, setMi] = useState(0);
	const m = MODELS[mi];
	const [cur, setCur] = useState(m.start);
	const [last, setLast] = useState<T | null>(null);
	const [path, setPath] = useState<string[]>([m.start]);
	const pos = Object.fromEntries(m.states.map((s) => [s.id, s]));
	const out = m.trans.filter((t) => t.from === cur);
	const choose = (i: number) => {
		setMi(i);
		setCur(MODELS[i].start);
		setLast(null);
		setPath([MODELS[i].start]);
	};
	const go = (t: T) => {
		setCur(t.to);
		setLast(t);
		setPath((p) => [...p.slice(-10), t.to]);
	};
	const edge = (t: T, k: number) => {
		const a = pos[t.from];
		const b = pos[t.to];
		const dx = b.x - a.x;
		const dy = b.y - a.y;
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const off = 12 + (t.curve ?? 0);
		const shrink = (px: number, py: number, qx: number, qy: number) => {
			// recorta el segmento para que no entre en la «píldora» del estado (104×34)
			const ddx = qx - px, ddy = qy - py;
			const tx = Math.abs(ddx) > 1e-6 ? 54 / Math.abs(ddx) : Infinity;
			const ty = Math.abs(ddy) > 1e-6 ? 19 / Math.abs(ddy) : Infinity;
			const tt = Math.min(tx, ty, 0.45);
			return [px + ddx * tt, py + ddy * tt];
		};
		const cx = (a.x + b.x) / 2 + nx * off * 2;
		const cy = (a.y + b.y) / 2 + ny * off * 2;
		const [x1, y1] = shrink(a.x + nx * 6, a.y + ny * 6, cx, cy);
		const [x2, y2] = shrink(b.x + nx * 6, b.y + ny * 6, cx, cy);
		const active = last && last.from === t.from && last.to === t.to;
		const avail = t.from === cur;
		// punto de la curva en u = 0.5 y etiqueta desplazada hacia afuera
		const lx = 0.25 * x1 + 0.5 * cx + 0.25 * x2 + nx * 10 + (t.ldx ?? 0);
		const ly = 0.25 * y1 + 0.5 * cy + 0.25 * y2 + ny * 10;
		return (
			<g key={k}>
				<path d={`M${x1},${y1} Q${cx},${cy} ${x2},${y2}`} fill="none" stroke={active ? 'var(--sl-color-accent)' : avail ? 'var(--pg-violet)' : 'var(--pg-border)'} strokeWidth={active || avail ? 2.2 : 1.3} strokeDasharray={t.label.startsWith('kill') ? '5 4' : undefined} markerEnd={`url(#arr${active ? 'A' : avail ? 'V' : ''})`} />
				<text x={lx} y={ly + 3} fontSize={9.5} textAnchor="middle" style={{ fill: avail ? 'var(--pg-violet)' : undefined, paintOrder: 'stroke', stroke: 'var(--pg-surface)', strokeWidth: 3 }}>
					{t.label}
				</text>
			</g>
		);
	};
	const cs = pos[cur];

	return (
		<div className="pg not-content">
			<h4>Diagramas de estado de procesos</h4>
			<p className="pg-sub">Haz clic en una transición disponible (en violeta) para mover el proceso. Cada transición explica <b>por qué</b> ocurre.</p>
			<div className="pg-seg">
				{MODELS.map((x, i) => (
					<button key={x.name} className={i === mi ? 'active' : ''} onClick={() => choose(i)}>{x.name}</button>
				))}
			</div>
			<div className="pg-scroll">
				<svg viewBox={`0 0 ${m.w} ${m.h}`} style={{ minWidth: 520 }} role="img" aria-label={m.name}>
					<defs>
						{[['', 'var(--pg-border)'], ['A', 'var(--sl-color-accent)'], ['V', 'var(--pg-violet)']].map(([id, c]) => (
							<marker key={id} id={`arr${id}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
								<path d="M0,0 L10,5 L0,10 z" fill={c} />
							</marker>
						))}
					</defs>
					{m.trans.map(edge)}
					{m.states.map((s) => (
						<g key={s.id} onClick={() => { const t = out.find((x) => x.to === s.id); if (t) go(t); }} style={{ cursor: out.some((x) => x.to === s.id) ? 'pointer' : 'default' }}>
							<rect x={s.x - 52} y={s.y - 17} width={104} height={34} rx={17} fill="var(--pg-tile)" stroke={s.id === cur ? 'var(--sl-color-accent)' : 'var(--pg-border)'} strokeWidth={s.id === cur ? 2.5 : 1} />
							<text x={s.x} y={s.y + 4} textAnchor="middle" fontSize={11} style={{ fill: 'var(--sl-color-white)', fontWeight: 600 }}>{s.label}</text>
						</g>
					))}
					<motion.rect key={mi} width={112} height={42} rx={21} fill="none" stroke="var(--sl-color-accent)" strokeWidth={2} animate={{ x: cs.x - 56, y: cs.y - 21, opacity: [0.9, 0.3, 0.9] }} transition={{ x: { type: 'spring', stiffness: 200, damping: 22 }, y: { type: 'spring', stiffness: 200, damping: 22 }, opacity: { repeat: Infinity, duration: 1.6 } }} />
				</svg>
			</div>
			<div className="pg-row">
				{out.map((t, k) => (
					<button key={k} className="primary" style={{ background: 'var(--pg-violet)' }} onClick={() => go(t)}>{t.label} → {pos[t.to].label}</button>
				))}
				{!out.length && <span style={{ color: 'var(--pg-muted)' }}>Estado final.</span>}
				<button onClick={() => choose(mi)}>Reiniciar</button>
			</div>
			<AnimatePresence mode="wait">
				<motion.div key={cur + (last?.label ?? '')} className="pg-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
					{last && (
						<div style={{ marginBottom: 6 }}>
							<b>{pos[last.from].label} → {pos[last.to].label} ({last.label}):</b> {last.why}
						</div>
					)}
					<b>{pos[cur].label}:</b> {pos[cur].desc}
				</motion.div>
			</AnimatePresence>
			<div className="lane" style={{ fontSize: '0.75rem' }}>
				{path.map((p, k) => (
					<span key={k} className="sim-proc">{pos[p]?.label ?? p}</span>
				))}
			</div>
			<div className="pg-note warn">{m.nota}</div>
		</div>
	);
}
