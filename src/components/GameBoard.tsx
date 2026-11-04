import { memo, useEffect, useMemo, useReducer, useState, type CSSProperties, type ReactNode } from 'react';
import { playSound } from '../audio/sound';
import { COIN_IDS } from '../config/coins';
import { GRID_COLS, GRID_ROWS } from '../config/economy';
import { PATTERN_BY_ID } from '../config/patterns';
import { cellCoords } from '../game/patterns';
import type { CoinId, Grid, SpinOutcome, WinTier } from '../game/types';
import { useGameStore } from '../store/gameStore';
import { CollectibleSymbol } from './collectibles/CollectibleSymbol';
import { revealSchedule, revealStageAt, spinSchedule, type RevealStage } from './spinSchedule';

/** One colour per winning pattern so overlapping wins stay distinguishable. */
export const MATCH_COLORS = ['#F5C84C', '#4FE3A1', '#62C6FF', '#FF8A65', '#C99BFF', '#FF73B0', '#B9EE6A', '#7FE7F0'];
export const matchColor = (i: number) => MATCH_COLORS[i % MATCH_COLORS.length];

const IDLE_GRID: Grid = ['b10', 's100', 'g500', 's200', 'b20', 'b50', 'wild', 'emerald', 'g1000', 'b10', 'b20', 'platinum', 's100', 'b50', 'g500'];

/** Where the post-spin show is right now; re-renders itself at each boundary. */
function useRevealStage(outcome: SpinOutcome | null): RevealStage | null {
  const phase = useGameStore((s) => s.spinPhase);
  const spinId = useGameStore((s) => s.spinId);
  const startedAt = useGameStore((s) => s.revealStartedAt);
  const skipped = useGameStore((s) => s.revealSkipped === s.spinId);
  const [, tick] = useReducer((x: number) => x + 1, 0);

  const sched = phase === 'result' && outcome ? revealSchedule(outcome) : null;
  const elapsed = skipped ? Infinity : performance.now() - startedAt;
  const stage = sched ? revealStageAt(sched, elapsed) : null;
  // Every moment the show changes: each pattern, the pause, TOTAL, done.
  const bounds = sched
    ? [...Array.from({ length: sched.steps }, (_, k) => (k + 1) * sched.patternMs), sched.totalAtMs, sched.creditAfterMs]
    : [];
  const nextIdx = bounds.findIndex((b) => b > elapsed);

  useEffect(() => {
    if (!sched || !stage || stage.stage === 'done' || nextIdx < 0) return;
    const t = window.setTimeout(tick, Math.max(16, bounds[nextIdx] - elapsed + 5));
    // Chime once per pattern, only when we arrive at it live (not when the tab is reopened).
    if (stage.stage === 'patterns' && elapsed - stage.focus * sched.patternMs < 150) playSound('pattern', stage.focus);
    return () => window.clearTimeout(t);
  }, [nextIdx, spinId]); // eslint-disable-line react-hooks/exhaustive-deps

  return stage;
}

/** The 5×3 board: spinning columns, landing, and the pattern-by-pattern win show. */
export function GameBoard() {
  const outcome = useGameStore((s) => s.outcome);
  const phase = useGameStore((s) => s.spinPhase);
  const spinId = useGameStore((s) => s.spinId);
  const startedAt = useGameStore((s) => s.spinStartedAt);
  const reduced = useGameStore((s) => s.reducedMotion);
  const unlocks = useGameStore((s) => s.game.coinUnlocks);
  const skipReveal = useGameStore((s) => s.skipReveal);

  const pool = useMemo(() => COIN_IDS.filter((id) => unlocks[id]), [unlocks]);
  const grid = outcome?.grid ?? IDLE_GRID;
  const schedule = useMemo(() => spinSchedule(grid, reduced), [grid, reduced]);
  const stage = useRevealStage(outcome);
  const matches = phase === 'result' && outcome ? outcome.reward.matches : [];
  const focus = stage?.stage === 'patterns' ? stage.focus : null;
  const done = !stage || stage.stage === 'done';
  const focused = focus !== null ? matches[focus] : null;

  // Position of each cell within the pattern being shown, for the lighting cascade.
  const order = useMemo(() => {
    const m = new Map<number, number>();
    focused?.match.cells.forEach((c, i) => m.set(c, i));
    return m;
  }, [focused]);

  const popCell = focused ? centreCell(focused.match.cells) : -1;
  const tier: WinTier = phase === 'result' && outcome ? outcome.winTier : 'none';
  const live = phase === 'spinning' || (phase === 'result' && !done);
  const rare = new Set(outcome?.rareCells ?? []);

  return (
    <section
      className={`board ${live ? 'is-live' : ''} ${phase === 'result' && !done ? 'is-revealing' : ''} ${stage?.stage === 'total' ? `win-${tier}` : ''}`}
      aria-label="Game board"
    >
      <div className="board__rays" aria-hidden />
      <BoardStatus phase={phase} stage={stage} outcome={outcome} />
      <div className="board__grid" role="img" aria-label={describeGrid(grid, phase)} onClick={() => !done && skipReveal()}>
        {Array.from({ length: GRID_COLS }, (_, c) => (
          <BoardColumn
            key={c}
            col={c}
            coins={Array.from({ length: GRID_ROWS }, (_, r) => grid[r * GRID_COLS + c])}
            pool={pool}
            spinId={spinId}
            startedAt={startedAt}
            stopMs={schedule.columnStops[c]}
            rareRows={Array.from({ length: GRID_ROWS }, (_, r) => rare.has(r * GRID_COLS + c))}
            litOrder={Array.from({ length: GRID_ROWS }, (_, r) => order.get(r * GRID_COLS + c) ?? -1)}
            hitColor={matchColor(focus ?? 0)}
            popRow={popCell >= 0 && popCell % GRID_COLS === c ? Math.floor(popCell / GRID_COLS) : -1}
            popText={focused ? `+${focused.total.toLocaleString()}` : ''}
            focusKey={focus ?? -1}
          />
        ))}
        {stage?.stage === 'total' && outcome && <TotalTakeover total={outcome.reward.total} tier={tier} />}
      </div>
      {!done && phase === 'result' && <div className="board__skip">Tap board to skip</div>}
    </section>
  );
}

/** The pattern cell closest to the pattern's centre: where its "+N" pops. */
function centreCell(cells: number[]): number {
  const pts = cells.map(cellCoords);
  const cx = pts.reduce((s, [c]) => s + c, 0) / pts.length;
  const cy = pts.reduce((s, [, r]) => s + r, 0) / pts.length;
  let best = 0;
  pts.forEach(([c, r], i) => {
    const [bc, br] = pts[best];
    if ((c - cx) ** 2 + (r - cy) ** 2 < (bc - cx) ** 2 + (br - cy) ** 2) best = i;
  });
  return cells[best];
}

function describeGrid(grid: Grid, phase: string): string {
  if (phase === 'spinning') return 'Reels spinning';
  const rows = Array.from({ length: GRID_ROWS }, (_, r) => grid.slice(r * GRID_COLS, r * GRID_COLS + GRID_COLS).join(' '));
  return `Grid: ${rows.join(' / ')}`;
}

/** A single line above the board narrating the spin: pattern name, multiplier and value. */
function BoardStatus({ phase, stage, outcome }: { phase: string; stage: RevealStage | null; outcome: SpinOutcome | null }) {
  let content: ReactNode = 'Match 3 or more coins in a pattern';
  let tone = 'idle';
  if (phase === 'spinning') {
    content = 'Good luck!';
    tone = 'spin';
  } else if (outcome && stage) {
    const total = outcome.reward.total;
    if (stage.stage === 'patterns') {
      const r = outcome.reward.matches[stage.focus];
      content = (
        <>
          <strong>{PATTERN_BY_ID[r.match.patternId].name}</strong>
          <span className="board__mult">×{+r.patternMultiplier.toFixed(2)}</span>
          <span className="board__gain">+{r.total.toLocaleString()}</span>
        </>
      );
      tone = 'pattern';
    } else if (stage.stage === 'total') {
      content = <>Total <span className="board__gain">+{total.toLocaleString()}</span></>;
      tone = 'total';
    } else {
      content = total > 0 ? <>You won <span className="board__gain">+{total.toLocaleString()}</span></> : 'No match. Spin again!';
      tone = total > 0 ? 'won' : 'idle';
    }
  }
  return (
    <div className={`board__status board__status--${tone}`} aria-live="polite">
      <span key={tone + (stage?.stage === 'patterns' ? stage.focus : '')}>{content}</span>
    </div>
  );
}

function TotalTakeover({ total, tier }: { total: number; tier: WinTier }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 700);
      setShown(Math.round(total * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [total]);
  const title = tier === 'jackpot' ? 'Jackpot!' : tier === 'large' ? 'Huge win!' : 'Total';
  return (
    <div className={`total total--${tier}`}>
      <span className="total__title">{title}</span>
      <strong className="total__amount">+{shown.toLocaleString()}</strong>
    </div>
  );
}

interface ColumnProps {
  col: number;
  coins: CoinId[];
  pool: CoinId[];
  spinId: number;
  startedAt: number;
  stopMs: number;
  rareRows: boolean[];
  /** Index of each cell within the pattern being shown, or -1. */
  litOrder: number[];
  hitColor: string;
  popRow: number;
  popText: string;
  focusKey: number;
}

/** One column. Purely visual: it scrolls a strip, then lands on the pre-decided coins. */
const BoardColumn = memo(function BoardColumn(p: ColumnProps) {
  const { col, coins, pool, spinId, startedAt, stopMs, rareRows, litOrder, hitColor, popRow, popText, focusKey } = p;
  const remaining = () => stopMs - (performance.now() - startedAt);
  const [rolling, setRolling] = useState(() => spinId > 0 && remaining() > 0);
  const hasRare = rareRows.some(Boolean);

  useEffect(() => {
    const left = remaining();
    if (spinId === 0 || left <= 0) return setRolling(false);
    setRolling(true);
    const t = window.setTimeout(() => {
      setRolling(false);
      playSound(hasRare ? 'rare' : 'stop');
    }, left);
    return () => window.clearTimeout(t);
  }, [spinId, startedAt, stopMs]); // eslint-disable-line react-hooks/exhaustive-deps

  const strip = useMemo(() => {
    const base = Array.from({ length: 6 }, (_, i) => pool[(i * 5 + col * 3 + spinId) % pool.length]);
    return [...base, ...base];
  }, [pool, col, spinId]);

  if (rolling) {
    return (
      <div className={`board__col is-rolling ${hasRare && remaining() < 650 ? 'is-anticipating' : ''}`}>
        <div className="board__strip" style={{ animationDuration: `${0.26 + (col % 3) * 0.02}s` }}>
          {strip.map((id, i) => (
            <div className="tile tile--strip" key={i}>
              <CollectibleSymbol id={id} state="blur" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="board__col">
      {coins.map((id, r) => {
        const lit = litOrder[r] >= 0;
        return (
          <div
            key={`${spinId}-${r}`}
            className={`tile ${lit ? 'tile--lit' : ''} ${rareRows[r] && spinId ? 'tile--rare' : ''}`}
            style={{ '--hit': hitColor, '--order': Math.max(0, litOrder[r]) } as CSSProperties}
          >
            <CollectibleSymbol id={id} state={spinId ? 'landing' : 'idle'} delay={spinId ? r * 35 : (col * 3 + r) * 160} />
            {lit && <span className="tile__ring" key={`ring-${focusKey}`} aria-hidden />}
            {lit && popRow === r && (
              <span className="tile__pop" key={`pop-${focusKey}`}>
                {popText}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});
