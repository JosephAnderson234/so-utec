# Web de estudio — E1 CS3015 Sistemas Operativos (UTEC)

Astro 7 + Starlight 0.42, MDX, islas React, KaTeX, Expressive Code y búsqueda Pagefind.
Animaciones: **Motion** (simuladores), **GSAP + ScrollTrigger** (portada, reveals, contadores), View Transitions (CSS) y canvas-confetti (quiz perfecto).

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # genera dist/ (estático)
pnpm preview    # sirve dist/
```

## Estructura

- `src/content/docs/`: 23 páginas (procesos, mutex, hardware/registros, semáforos, monitores, memoria, exámenes).
- `src/components/sim/`: 9 simuladores React:
  - `ForkTree`: árbol de procesos y conteo de «Hello!».
  - `MutexStepper`: intercalador con búsqueda BFS de contraejemplos.
  - `SemaphoreSim`: intérprete wait/signal con detección de deadlock.
  - `RWMonitor`: lectores–escritores Mesa/Hoare.
  - `PagingCalc`, `SegmentTranslator`, `BuddySim`, `PlacementSim` y `RegisterTimeline`.
- `src/components/Quiz.tsx` y `Flashcards.tsx`: el progreso se guarda en `localStorage`.
- `src/components/Head.astro`: barra de progreso y animaciones GSAP.
- Sidebar: `astro.config.mjs`.

El código C de los exámenes se verificó en WSL: `~/so/verif_parcial/` (`hello24.c`, `hellofe.c`, `argrace.c`, `bath.c` y `bathsem.c`).

## Deploy en Vercel

Vercel detecta Astro automáticamente: build `pnpm build`, output `dist/`. No requiere variables de entorno.
