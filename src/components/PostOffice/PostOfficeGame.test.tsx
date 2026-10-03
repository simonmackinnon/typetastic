import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import PostOfficeGame from './PostOfficeGame';
import { BELT_MS, MAX_PARCELS, ROUND_MS, TICK_MS } from '../../hooks/usePostOfficeGame';

// random() === 0 -> every parcel in the first third of the round is "BOS" (NE bucket).
function renderGame(onComplete = vi.fn()) {
  render(<PostOfficeGame onComplete={onComplete} random={() => 0} />);
  return onComplete;
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function startRound() {
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  advance(3000);     // countdown
  advance(TICK_MS);  // first parcel spawns
}

function activeChars() {
  const parcel = screen.getByTestId('active-parcel');
  return Array.from(parcel.querySelectorAll('[data-state]')).map((el) => el.getAttribute('data-state'));
}

describe('PostOfficeGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a Start button before the round', () => {
    renderGame();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('belt')).not.toBeInTheDocument();
  });

  it('renders the belt, HUD and one bucket per region once playing', () => {
    renderGame();
    startRound();
    expect(screen.getByTestId('belt')).toBeInTheDocument();
    expect(screen.getByTestId('hud-time')).toHaveTextContent('1:00');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('0');
    for (const r of ['NE', 'SE', 'MW', 'W']) {
      expect(screen.getByTestId(`bucket-${r}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId('active-parcel')).toHaveAttribute('data-code', 'BOS');
  });

  it('highlights typed characters live', () => {
    renderGame();
    startRound();
    expect(activeChars()).toEqual(['current', 'pending', 'pending']);
    press('B');
    expect(activeChars()).toEqual(['typed', 'current', 'pending']);
    press('O');
    expect(activeChars()).toEqual(['typed', 'typed', 'current']);
  });

  it('a mistyped character marks it wrong and shakes, without failing the parcel', () => {
    renderGame();
    startRound();
    press('B');
    press('Z');
    expect(activeChars()).toEqual(['typed', 'wrong', 'pending']);
    const parcel = screen.getByTestId('active-parcel');
    expect(parcel.querySelector('.animate-shake')).not.toBeNull();
    expect(parcel).toHaveAttribute('data-code', 'BOS');

    // Player corrects and finishes the same parcel
    press('O');
    press('S');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1');
  });

  it('completing a code routes the parcel into its region bucket', () => {
    renderGame();
    startRound();
    press('B');
    press('O');
    press('S');
    expect(screen.getByTestId('bucket-NE-count')).toHaveTextContent('1');
    expect(screen.getByTestId('bucket-SE-count')).toHaveTextContent('0');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('1');
  });

  it('a parcel reaching the end of the belt is counted as missed', () => {
    renderGame();
    startRound();
    press('B');
    press('O');
    press('S'); // streak 1
    advance(3000 + BELT_MS); // next parcel spawns and runs off the belt
    expect(screen.getByTestId('hud-missed')).not.toHaveTextContent('0');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('0');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1');
    expect(screen.getByText('Missed!')).toBeInTheDocument();
    expect(screen.getByTestId('bucket-NE-count')).toHaveTextContent('1');
  });

  it('never renders more than MAX_PARCELS parcels on the belt', () => {
    renderGame();
    startRound();
    for (let t = 0; t < ROUND_MS - 2000; t += 1000) {
      advance(1000);
      const live =
        screen.queryAllByTestId('active-parcel').length + screen.queryAllByTestId('queued-parcel').length;
      expect(live).toBeLessThanOrEqual(MAX_PARCELS);
    }
  });

  it('calls onComplete with the round result when time runs out', () => {
    const onComplete = renderGame();
    startRound();
    press('B');
    press('O');
    press('S');
    advance(ROUND_MS);
    expect(onComplete).not.toHaveBeenCalled(); // waits for the exit animation
    advance(600);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ score: 1, bestStreak: 1, accuracy: 100 }),
    );
  });
});
