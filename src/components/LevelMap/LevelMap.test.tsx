import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import LevelMap from './LevelMap';
import { ProgressContext } from '../../context/ProgressContext';
import type { PlayerStats } from '../../types';

vi.mock('../../services/auth', () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  confirmSignUp: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null),
  getIdToken: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../services/api', () => ({
  fetchProgress: vi.fn().mockResolvedValue([]),
  saveProgress: vi.fn().mockResolvedValue(undefined),
  fetchBadges: vi.fn().mockResolvedValue([]),
  unlockBadge: vi.fn().mockResolvedValue(undefined),
}));

const emptyStats: PlayerStats = {
  totalStars: 0,
  levelsCompleted: 0,
  highestLevel: 0,
  bestWpm: 0,
  totalTimeMinutes: 0,
  badgesEarned: [],
  bestPostOfficeScore: 0,
  totalParcelsRouted: 0,
};

function makeProgressCtx(progress: Record<string, { stars: 0 | 1 | 2 | 3 }> = {}) {
  return {
    progress,
    earnedBadges: [],
    newBadges: [],
    stats: emptyStats,
    submitResult: vi.fn(),
    dismissNewBadges: vi.fn(),
    reload: vi.fn(),
  };
}

function renderMap(ctx = makeProgressCtx()) {
  return render(
    // @ts-expect-error partial context for testing
    <ProgressContext.Provider value={ctx}>
      <MemoryRouter>
        <LevelMap />
      </MemoryRouter>
    </ProgressContext.Provider>,
  );
}

describe('LevelMap', () => {
  it('renders all 20 level cards', () => {
    renderMap();
    for (let i = 1; i <= 20; i++) {
      const id = String(i).padStart(2, '0');
      expect(screen.getByTestId(`level-${id}`)).toBeInTheDocument();
    }
  });

  it('renders all 6 zone headings', () => {
    renderMap();
    expect(screen.getByText(/Keyboard Kingdom/)).toBeInTheDocument();
    expect(screen.getByText(/Top Tower/)).toBeInTheDocument();
    expect(screen.getByText(/Bottom Bunker/)).toBeInTheDocument();
    expect(screen.getByText(/Word World/)).toBeInTheDocument();
    expect(screen.getByText(/Sentence City/)).toBeInTheDocument();
    expect(screen.getByText(/Speed Summit/)).toBeInTheDocument();
  });

  it('level 1 is always unlocked', () => {
    renderMap();
    const level1 = screen.getByTestId('level-01');
    expect(level1).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('level 2 is locked when level 1 is not completed', () => {
    renderMap();
    const level2 = screen.getByTestId('level-02');
    expect(level2).toHaveAttribute('aria-disabled', 'true');
  });

  it('level 2 is unlocked when level 1 has stars', () => {
    const ctx = makeProgressCtx({ '01': { stars: 2 } });
    renderMap(ctx);
    const level2 = screen.getByTestId('level-02');
    expect(level2).not.toHaveAttribute('aria-disabled', 'true');
  });
});
