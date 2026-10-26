import { useEffect, useState } from 'react';
import { load, save } from '../ui/storage';
import { NIVELES, TEMAS, clave, proximo, type Registro } from './temas';

const fmt = (d: Date) => d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });

/** Autoevaluación de dominio (0–4) al final de cada página; programa el próximo repaso. */
export default function Dominio({ id }: { id: string }) {
	const tema = TEMAS.find((x) => x.id === id);
	const [reg, setReg] = useState<Registro | null>(null);

	useEffect(() => setReg(load<Registro | null>(clave(id), null)), [id]);

	const marcar = (nivel: number) => {
		const r = { nivel, fecha: new Date().toISOString() };
		setReg(r);
		save(clave(id), r);
	};

	return (
		<div className="pg tutor-dominio not-content">
			<h4>📈 ¿Qué tan bien lo dominas?</h4>
			<p className="pg-sub">
				Elige pensando en lo que <b>hiciste</b>, no en lo que leíste. Para marcar 3 tienes que haber resuelto un ejercicio nuevo sin pistas y
				haberlo justificado. Si solo lo leíste y sientes que «ya entendí», todavía es un 1.
			</p>
			<div className="tutor-dominio__niveles">
				{NIVELES.map((n, i) => (
					<button key={i} className={reg?.nivel === i ? 'on' : ''} onClick={() => marcar(i)} aria-pressed={reg?.nivel === i}>
						<b>{i}</b>
						<span>{n}</span>
					</button>
				))}
			</div>
			{reg && (
				<p className="tutor-dominio__next">
					Guardado. {reg.nivel === 0 ? 'Repásalo hoy mismo' : `Próximo repaso: ${fmt(proximo(reg))}`}. Tu plan completo está en la{' '}
					<a href="/final/ruta/#tu-panel-de-repaso">Ruta de repaso</a>
					{tema ? ` (peso en el LC3: ${'●'.repeat(tema.peso)}${'○'.repeat(3 - tema.peso)})` : ''}.
				</p>
			)}
		</div>
	);
}
