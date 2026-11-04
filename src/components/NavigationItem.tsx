import type { ReactNode } from 'react';

// Custom navigation icons drawn as one family: 24×24 grid, 2px rounded strokes, with a
// soft filled accent that only appears on the active tab.
const ICONS: Record<string, (active: boolean) => ReactNode> = {
  machine: (a) => (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" fill={a ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="M9 8v8M15 8v8" />
      <circle cx="6" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  upgrades: (a) => (
    <>
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" fill={a ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <path d="M12 3l7.8 4.5v9L12 21l-7.8-4.5v-9z" />
      <path d="M12 16V8M8.5 11.5L12 8l3.5 3.5" />
    </>
  ),
  cards: (a) => (
    <>
      <rect x="8" y="3" width="12" height="16" rx="2.5" transform="rotate(8 14 11)" fill={a ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <rect x="8" y="3" width="12" height="16" rx="2.5" transform="rotate(8 14 11)" />
      <rect x="4" y="5" width="12" height="16" rx="2.5" fill="var(--nav-bg)" />
      <path d="M10 10.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" />
    </>
  ),
  collection: (a) => (
    <>
      <path d="M7 4h10l4 5-9 11L3 9z" fill={a ? 'currentColor' : 'none'} fillOpacity={0.18} />
      <path d="M7 4h10l4 5-9 11L3 9z" />
      <path d="M3 9h18M9.5 4L8 9l4 11 4-11-1.5-5" />
    </>
  ),
  stats: (a) => (
    <>
      <rect x="4" y="12" width="4" height="8" rx="1.2" fill={a ? 'currentColor' : 'none'} fillOpacity={0.25} />
      <rect x="10" y="8" width="4" height="12" rx="1.2" fill={a ? 'currentColor' : 'none'} fillOpacity={0.25} />
      <rect x="16" y="4" width="4" height="16" rx="1.2" fill={a ? 'currentColor' : 'none'} fillOpacity={0.25} />
      <rect x="4" y="12" width="4" height="8" rx="1.2" />
      <rect x="10" y="8" width="4" height="12" rx="1.2" />
      <rect x="16" y="4" width="4" height="16" rx="1.2" />
    </>
  ),
};

export function NavIcon({ name, active }: { name: string; active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {ICONS[name](active)}
    </svg>
  );
}

export function NavigationItem({
  id,
  label,
  active,
  badge,
  onSelect,
}: {
  id: string;
  label: string;
  active: boolean;
  /** Count of things to act on; hidden when 0. */
  badge?: number;
  onSelect: () => void;
}) {
  return (
    <button className={`nav-item ${active ? 'is-active' : ''}`} onClick={onSelect} aria-current={active ? 'page' : undefined}>
      <span className="nav-item__icon">
        <NavIcon name={id} active={active} />
        {!!badge && (
          <span className="nav-item__badge" aria-label={`${badge} available`}>
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span className="nav-item__label">{label}</span>
    </button>
  );
}
