import { useEffect, useMemo, useState } from 'react';
import { load, save } from '../ui/storage';
import { NIVELES, TEMAS, clave, proximo, type Registro } from './temas';

const DIA = 86_400_000;
const fmt = (d: Date) => d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });

/** Panel de repaso: prioridad = peso en el LC3 × brecha de dominio, más un bono si el repaso ya venció. */
export default function PanelRepaso() {
	const [regs, setRegs] = useState<Record<string, Registro | null>>({});
	const [copiado, setCopiado] = useState(false);

	useEffect(() => {
		setRegs(Object.fromEntries(TEMAS.map((x) => [x.id, load<Registro | null>(clave(x.id), null)])));
	}, []);

	const filas = useMemo(() => {
		const hoy = Date.now();
		return TEMAS.map((x) => {
			const r = regs[x.id] ?? null;
			const nivel = r ? r.nivel : 0;
			const vence = r ? proximo(r) : null;
			const vencido = !vence || vence.getTime() <= hoy + DIA / 2;
			const prioridad = x.peso * (4 - nivel) + (vencido ? 2 : 0);
			return { ...x, r, nivel, vence, vencido, prioridad };
		}).sort((a, b) => b.prioridad - a.prioridad);
	}, [regs]);

	const hoyToca = filas.filter((f) => f.vencido && f.nivel < 4).slice(0, 4);
	const evaluados = filas.filter((f) => f.r);
	const media = evaluados.length ? evaluados.reduce((s, f) => s + f.nivel, 0) / evaluados.length : 0;

	const borrar = () => {
		TEMAS.forEach((x) => save(clave(x.id), null));
		setRegs({});
	};

	const registro = () =>
		[
			'## Registro Adaptive CS Tutor',
			`Curso: CS3015 Sistemas Operativos · Fecha: ${fmt(new Date())} · Próxima evaluación: LC3`,
			'| Tema | Nivel (0–4) | Evidencia | Próximo repaso |',
			'|------|-------------|-----------|----------------|',
			...evaluados.map((f) => `| ${f.t} | ${f.nivel} | ${NIVELES[f.nivel]} | ${f.vencido ? 'hoy' : fmt(f.vence!)} |`),
			`Repasar en la próxima sesión: ${hoyToca.map((f) => f.t).join(', ') || '—'}`,
		].join('\n');

	const copiar = async () => {
		try {
			await navigator.clipboard.writeText(registro());
			setCopiado(true);
			setTimeout(() => setCopiado(false), 2000);
		} catch {
			setCopiado(false);
		}
	};

	return (
		<div className="pg tutor-panel not-content">
			<div className="pg-row" style={{ justifyContent: 'space-between' }}>
				<h4>Tu panel de repaso</h4>
				<span style={{ color: 'var(--pg-muted)' }}>
					{evaluados.length}/{TEMAS.length} temas evaluados{evaluados.length ? ` · nivel medio ${media.toFixed(1)}` : ''}
				</span>
			</div>
			<p className="pg-sub">
				Se llena con lo que marcas en el recuadro «¿Qué tan bien lo dominas?» al final de cada página. Se guarda solo en este navegador.
			</p>
			<div className="tutor-panel__hoy">
				<b>Hoy toca:</b>{' '}
				{hoyToca.length ? (
					hoyToca.map((f, i) => (
						<span key={f.id}>
							<a href={f.href}>{f.t}</a>
							{i < hoyToca.length - 1 ? ' → ' : ''}
						</span>
					))
				) : (
					<span>no tienes repasos vencidos. Haz un simulacro del LC3 para comprobar que lo retienes.</span>
				)}
			</div>
			<div className="tutor-panel__tabla">
				<table>
					<thead>
						<tr>
							<th>Tema</th>
							<th>Peso</th>
							<th>Nivel</th>
							<th>Repaso</th>
						</tr>
					</thead>
					<tbody>
						{filas.map((f) => (
							<tr key={f.id} className={f.vencido ? 'vencido' : ''}>
								<td>
									<span className="tutor-panel__u">{f.u}</span> <a href={f.href}>{f.t}</a>
								</td>
								<td title="Peso estimado en el LC3">
									{'●'.repeat(f.peso)}
									{'○'.repeat(3 - f.peso)}
								</td>
								<td>{f.r ? f.nivel : '—'}</td>
								<td>{!f.r ? 'sin evaluar' : f.vencido ? 'hoy' : fmt(f.vence!)}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className="pg-row">
				<button onClick={copiar}>{copiado ? 'Copiado ✓' : 'Copiar registro de progreso'}</button>
				<button onClick={borrar}>Borrar todo</button>
			</div>
		</div>
	);
}
