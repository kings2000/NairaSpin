# Naira Spin

A mobile-first, free-to-play incremental coin-collection arcade game built with React, TypeScript, Vite, Zustand
and plain CSS. You spin a 5×3 grid of collectible Naira-inspired coins, and every pattern on the grid pays.
All rewards are fictional game points. There is no real-money wagering, purchase, withdrawal or redemption, and
the coin designs are original and not legal tender.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (Vitest)
npm run build    # type-check + production build to dist/
```

## How it plays

- Each spin fills 15 cells independently from the weighted coin pool.
- 22 data-driven patterns (rows, columns, diagonals, L/T/Z/V/cross, blocks, frame, arch, full grid) are checked
  in every position they fit. Every winning pattern pays, overlapping ones included.
- Pattern payout = coin value × matched coins × pattern multiplier, plus card/charm bonuses. Spin bonuses
  (booster, Pattern Expert, streaks) and special-coin rewards are then added on top.
- Wild coins complete patterns for any coin except Platinum. An all-Wild pattern pays the Wild coin's own value.
- A smaller win of the same coin that sits entirely inside a bigger one is not paid again
  (for example, the Horizontal 3s inside a Horizontal 5).

## Architecture

| Path | Responsibility |
|------|----------------|
| `src/config/coins.ts` | Coin definitions (tier, denomination vs value, weight, unlock, emblem, special effect), Wild rules |
| `src/config/patterns.ts` | Pattern catalogue (shapes as `[col,row]`, multiplier, family, unlock level) |
| `src/config/cards.ts` | Cards, charms and card slots, all expressed as `Effect` data |
| `src/config/upgrades.ts` | Coin Chance/Value, pattern and machine upgrades |
| `src/config/economy.ts` | XP curve, win-feedback thresholds, spin timing, offline, daily rewards |
| `src/game/patterns.ts` | Pattern evaluator: placement, Wild substitution, de-duplication, subsumption, drawing segments |
| `src/game/effects.ts` | Effect-handler registry shared by cards, charms and upgrades |
| `src/game/probability.ts` | Coin weights, normalisation, grid roll |
| `src/game/rewards.ts` | Reward calculator with per-pattern breakdown, special coins, win tier |
| `src/game/spin.ts` | `rollSpin` decides the whole outcome up front, then `applySpin` credits it once |
| `src/game/cards.ts`, `upgrades.ts`, `progression.ts`, `statistics.ts`, `achievements.ts`, `daily.ts`, `offline.ts` | Supporting systems |
| `src/persistence/` | `SaveRepository` interface, LocalStorage adapter, validating loader with v1 → v2 migration |
| `src/store/gameStore.ts` | Zustand controller (no game rules) |
| `src/components/`, `src/screens/` | UI. `CoinArt` is layered SVG with shared gradients, and `SlotGrid` draws the grid and pattern showcase |

### Probability model

Each unlocked coin has weight = base weight × Π(1 + amount) over every active weight effect. The product is clamped
to at least 0.1, so a weight can never be zero or negative. Then `p = weight / Σ weights`, so probabilities always
total 100%.

### Production notes

The client-side balance is for the prototype only. A banking-app integration should implement `SaveRepository`
against an authenticated backend, and it should run `rollSpin`/`applySpin` on the server. In dev builds the store
is available in the console as `window.naira`.
