import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type Ev =
	| { k: 'fork'; p: string; c: string; line: number; txt: string }
	| { k: 'hello'; who: string; line: number; txt: string }
	| { k: 'exit'; who: string; line: number; txt: string }
	| { k: 'block'; who: string; line: number; txt: string }
	| { k: 'note'; who: string; line: number; txt: string };
type Prog = { id: string; name: string; code: string[]; root: string; events: Ev[]; answer: string };

const THREAD_PRINT: Prog = {
	id: 'tp',
	name: 'E1 2024-I · thread_print',
	root: 'P',
	code: [
		'void *thread_print(void *value) {',
		'  if (*((pid_t *) value))',
		'    printf("Hello!\\n");',
		'}',
		'int main() {',
		'  pid_t parent;',
		'  pid_t grandparent = fork();',
		'  if (!grandparent) {',
		'    parent = fork();',
		'    printf("Hello!\\n");',
		'    if (!parent) exit(0);',
		'  } else {',
		'    pthread_create(&t, NULL, thread_print, &grandparent);',
		'    pthread_join(t, NULL);',
		'  }',
		'  printf("Hello!\\n");',
		'  parent = fork();',
		'  pthread_create(&t2, NULL, thread_print, &parent);',
		'  pthread_join(t2, NULL);',
		'}',
	],
	events: [
		{ k: 'fork', p: 'P', c: 'C', line: 6, txt: 'P hace fork(): en P grandparent = pid(C) ≠ 0; en C grandparent = 0' },
		{ k: 'fork', p: 'C', c: 'D', line: 8, txt: 'C entra al if (grandparent == 0) y hace fork(): en D parent = 0' },
		{ k: 'hello', who: 'C', line: 9, txt: 'C imprime (línea del if)' },
		{ k: 'hello', who: 'D', line: 9, txt: 'D imprime (línea del if)' },
		{ k: 'exit', who: 'D', line: 10, txt: 'D tiene parent == 0 → exit(0)' },
		{ k: 'hello', who: 'P', line: 2, txt: 'P va al else: el thread lee grandparent ≠ 0 → imprime' },
		{ k: 'hello', who: 'C', line: 15, txt: 'C imprime después del if' },
		{ k: 'hello', who: 'P', line: 15, txt: 'P imprime después del if' },
		{ k: 'fork', p: 'P', c: 'P2', line: 16, txt: 'P hace fork(): en P2 parent = 0' },
		{ k: 'fork', p: 'C', c: 'C2', line: 16, txt: 'C hace fork(): en C2 parent = 0' },
		{ k: 'hello', who: 'P', line: 2, txt: 'Thread de P: parent ≠ 0 → imprime' },
		{ k: 'note', who: 'P2', line: 1, txt: 'Thread de P2: parent == 0 → NO imprime' },
		{ k: 'hello', who: 'C', line: 2, txt: 'Thread de C: parent ≠ 0 → imprime' },
		{ k: 'note', who: 'C2', line: 1, txt: 'Thread de C2: parent == 0 → NO imprime' },
	],
	answer: '7 «Hello!» (opción 2). Verificado compilando y ejecutando en WSL.',
};

const FORK_EXEC: Prog = {
	id: 'fe',
	name: 'E1 2024-II · fork + execv + semáforo',
	root: 'P',
	code: [
		'void *thr_hello(void *arg) {',
		'  sem_wait(&mutex);',
		'  printf("Hello!\\n");',
		'  if (*(int *) arg) sem_post(&mutex);',
		'}',
		'int main(int argc, char *argv[]) {',
		'  if (argc > 1) { printf("Hello!\\n"); return 0; }',
		'  pid = fork();',
		'  if (!pid) execv("./hello-fork-exec", {"1","2"});',
		'  pid = fork();',
		'  sem_init(&mutex, 0, 1);',
		'  pthread_create(&thr, NULL, thr_hello, &pid);',
		'  pthread_join(thr, NULL);',
		'  sem_wait(&mutex);',
		'  printf("Hello!\\n");',
		'}',
	],
	events: [
		{ k: 'note', who: 'P', line: 6, txt: 'argc = 1 → no imprime en la línea 6' },
		{ k: 'fork', p: 'P', c: 'H1', line: 7, txt: 'P hace fork(): en H1 pid = 0' },
		{ k: 'note', who: 'H1', line: 8, txt: 'H1 hace execv: se reemplaza su imagen, ahora argc = 2' },
		{ k: 'hello', who: 'H1', line: 6, txt: 'H1 (nuevo programa) tiene argc > 1 → imprime y termina' },
		{ k: 'exit', who: 'H1', line: 6, txt: 'H1 retorna' },
		{ k: 'fork', p: 'P', c: 'H2', line: 9, txt: 'P hace fork(): en H2 pid = 0, en P pid ≠ 0' },
		{ k: 'hello', who: 'P', line: 2, txt: 'Thread de P: sem_wait (1→0), imprime y hace sem_post (pid ≠ 0)' },
		{ k: 'hello', who: 'H2', line: 2, txt: 'Thread de H2: sem_wait (1→0), imprime pero NO hace sem_post (pid = 0)' },
		{ k: 'hello', who: 'P', line: 14, txt: 'main de P: sem_wait pasa → imprime' },
		{ k: 'block', who: 'H2', line: 13, txt: 'main de H2: sem_wait con valor 0 → bloqueado para siempre' },
	],
	answer: '4 «Hello!» (opción 1). Coincide con el solucionario y con la ejecución en WSL.',
};

function forkLoop(n: number): Prog {
	const events: Ev[] = [];
	let procs = ['P'];
	for (let i = 0; i < n; i++) {
		const next: string[] = [];
		for (const p of procs) {
			const c = `${p}${i}`.replace(/^P/, 'H');
			events.push({ k: 'fork', p, c, line: 1, txt: `i = ${i}: ${p} hace fork() → ${c} (hereda i = ${i}, continúa con i = ${i + 1})` });
			next.push(c);
		}
		procs = procs.concat(next);
	}
	for (const p of procs) events.push({ k: 'hello', who: p, line: 2, txt: `${p} imprime` });
	return {
		id: 'loop',
		name: `for (i = 0; i < ${n}; i++) fork();`,
		root: 'P',
		code: [`for (int i = 0; i < ${n}; i++)`, '  fork();', 'printf("Hello!\\n");'],
		events,
		answer: `2^${n} = ${2 ** n} procesos → ${2 ** n} «Hello!». Cada fork duplica a TODOS los procesos vivos.`,
	};
}

type Node = { id: string; kids: string[]; state: 'vivo' | 'exit' | 'bloq'; hellos: number };

export default function ForkTree() {
	const [pid, setPid] = useState<'tp' | 'fe' | 'loop'>('tp');
	const [n, setN] = useState(3);
	const prog = useMemo(() => (pid === 'tp' ? THREAD_PRINT : pid === 'fe' ? FORK_EXEC : forkLoop(n)), [pid, n]);
	const [t, setT] = useState(0);
	const [play, setPlay] = useState(false);

	useEffect(() => setT(0), [prog]);
	useEffect(() => {
		if (!play) return;
		if (t >= prog.events.length) {
			setPlay(false);
			return;
		}
		const h = setTimeout(() => setT((x) => x + 1), 850);
		return () => clearTimeout(h);
	}, [play, t, prog]);

	const nodes = useMemo(() => {
		const m = new Map<string, Node>([[prog.root, { id: prog.root, kids: [], state: 'vivo', hellos: 0 }]]);
		for (const e of prog.events.slice(0, t)) {
			if (e.k === 'fork') {
				m.get(e.p)!.kids.push(e.c);
				m.set(e.c, { id: e.c, kids: [], state: 'vivo', hellos: 0 });
			} else if (e.k === 'hello') m.get(e.who)!.hellos++;
			else if (e.k === 'exit') m.get(e.who)!.state = 'exit';
			else if (e.k === 'block') m.get(e.who)!.state = 'bloq';
		}
		return m;
	}, [prog, t]);
	const total = prog.events.slice(0, t).filter((e) => e.k === 'hello').length;
	const last = t > 0 ? prog.events[t - 1] : null;
	const lastWho = last ? (last.k === 'fork' ? last.c : last.who) : null;

	const render = (id: string): React.ReactNode => {
		const nd = nodes.get(id)!;
		return (
			<motion.li key={id} layout initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
				<span className={`sim-proc ${nd.state === 'exit' ? '' : nd.state === 'bloq' ? 'blk' : id === lastWho ? 'run' : ''}`} style={nd.state === 'exit' ? { opacity: 0.45, textDecoration: 'line-through' } : undefined}>
					{id}
					{nd.state === 'bloq' && ' 🔒'}
					<AnimatePresence>
						{Array.from({ length: nd.hellos }).map((_, k) => (
							<motion.span key={k} className="badge" style={{ background: 'var(--pg-ok)' }} initial={{ scale: 0 }} animate={{ scale: 1 }}>
								Hello!
							</motion.span>
						))}
					</AnimatePresence>
				</span>
				{nd.kids.length > 0 && <ul>{nd.kids.map(render)}</ul>}
			</motion.li>
		);
	};

	return (
		<div className="pg not-content">
			<h4>Árbol de procesos: ¿cuántos «Hello!»?</h4>
			<p className="pg-sub">Avanza evento por evento. Recuerda: <b>fork</b> copia el proceso entero (variables y semáforos incluidos, pero solo el hilo que llamó), <b>execv</b> reemplaza la imagen y <b>exit</b> lo termina.</p>
			<div className="pg-seg">
				<button className={pid === 'tp' ? 'active' : ''} onClick={() => setPid('tp')}>{THREAD_PRINT.name}</button>
				<button className={pid === 'fe' ? 'active' : ''} onClick={() => setPid('fe')}>{FORK_EXEC.name}</button>
				<button className={pid === 'loop' ? 'active' : ''} onClick={() => setPid('loop')}>Bucle de forks</button>
			</div>
			{pid === 'loop' && (
				<label className="pg-field">
					<span>n = <b>{n}</b></span>
					<input type="range" min={1} max={4} value={n} onChange={(e) => setN(+e.target.value)} />
				</label>
			)}
			<div className="pg-grid-2">
				<pre className="pg-code">
					{prog.code.map((l, k) => (
						<div key={k} className={`ln ${last && last.line === k ? 'hl' : ''}`}>
							<span className="num">{k}</span>
							<span>{l}</span>
						</div>
					))}
				</pre>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
					<div className="pg-stats">
						<div className="pg-stat">
							<span className="k">«Hello!» impresos</span>
							<motion.span className="v" key={total} initial={{ scale: 1.5, color: 'var(--pg-ok)' }} animate={{ scale: 1, color: 'var(--sl-color-white)' }} style={{ fontSize: '2rem' }}>
								{total}
							</motion.span>
						</div>
						<div className="pg-stat">
							<span className="k">Procesos creados</span>
							<span className="v">{nodes.size}</span>
						</div>
					</div>
					<div className="tree">
						<ul>{render(prog.root)}</ul>
					</div>
				</div>
			</div>
			<div className="pg-row">
				<button className="primary" onClick={() => setT((x) => Math.min(prog.events.length, x + 1))} disabled={t >= prog.events.length}>Siguiente evento</button>
				<button onClick={() => setPlay((p) => !p)}>{play ? 'Pausa' : 'Reproducir'}</button>
				<button onClick={() => setT((x) => Math.max(0, x - 1))} disabled={t === 0}>Atrás</button>
				<button onClick={() => { setT(0); setPlay(false); }}>Reiniciar</button>
				<span style={{ color: 'var(--pg-muted)' }}>{t}/{prog.events.length}</span>
			</div>
			<AnimatePresence mode="wait">
				<motion.div key={t} className="pg-note" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
					{last ? last.txt : 'Pulsa «Siguiente evento» o «Reproducir». Intenta predecir el total antes de terminar.'}
				</motion.div>
			</AnimatePresence>
			{t === prog.events.length && <div className="pg-note ok">✔ {prog.answer}</div>}
		</div>
	);
}
