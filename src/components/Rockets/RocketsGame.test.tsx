import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RocketsGame from './RocketsGame';
import { LAUNCH_SPEED, ROUND_MS, thrustFor } from '../../hooks/useRocketsGame';

// random() === 0 -> the round opens with SUN, previewing MOON.
function renderGame(onComplete = vi.fn()) {
  render(<RocketsGame onComplete={onComplete} random={() => 0} />);
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

function type(text: string) {
  for (const ch of text) press(ch);
}

function typeActiveWord() {
  type(screen.getByTestId('active-word').getAttribute('data-word')!);
}

function startRound() {
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  advance(3000); // countdown
}

function wordStates() {
  return Array.from(screen.getByTestId('active-word').querySelectorAll('[data-state]')).map((el) =>
    el.getAttribute('data-state'),
  );
}

const speed = () => Number(screen.getByRole('meter', { name: 'Speed' }).getAttribute('aria-valuenow'));
const sceneryOffset = () => Number(screen.getByTestId('scenery').getAttribute('data-offset'));
const stallSeconds = () => Number(screen.getByTestId('stall-warning').textContent!.replace(/\D/g, ''));

describe('RocketsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a Start button before the round', () => {
    renderGame();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('sky')).not.toBeInTheDocument();
  });

  it('autoStart skips the Start button and begins the countdown', () => {
    render(<RocketsGame onComplete={vi.fn()} random={() => 0} autoStart />);
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    advance(3000);
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'SUN');
  });

  it('renders the flying rocket, scenery, HUD, speed gauge and words once playing', () => {
    renderGame();
    startRound();
    expect(screen.getByTestId('sky')).toHaveAttribute('data-stage', 'Sky');
    expect(screen.getByTestId('scenery')).toBeInTheDocument();
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-engine', 'burning');
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-thrusts', '0');
    expect(screen.queryByTestId('thrust')).not.toBeInTheDocument();
    expect(screen.getByTestId('hud-time')).toHaveTextContent('1:00');
    expect(screen.getByTestId('hud-km')).toHaveTextContent('0 km');
    expect(screen.getByTestId('hud-km')).toHaveAccessibleName('Altitude 0 kilometres');
    expect(speed()).toBe(LAUNCH_SPEED);
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'SUN');
    expect(screen.getByTestId('next-word')).toHaveTextContent('MOON');
  });

  it('highlights typed letters live and moves the preview in when a word is done', () => {
    renderGame();
    startRound();
    expect(wordStates()).toEqual(['current', 'pending', 'pending']);
    press('s');
    expect(wordStates()).toEqual(['typed', 'current', 'pending']);
    type('UN');
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'MOON');
    expect(screen.getByTestId('next-word')).toHaveTextContent('SUN');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('1');
  });

  it('fires a thrust each time a word is completed, and not for single letters', () => {
    renderGame();
    startRound();
    type('su');
    expect(screen.queryByTestId('thrust')).not.toBeInTheDocument();
    expect(speed()).toBe(LAUNCH_SPEED);

    press('n');
    expect(screen.getByTestId('thrust')).toBeInTheDocument();
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-thrusts', '1');
    expect(speed()).toBeCloseTo(LAUNCH_SPEED + thrustFor('SUN'), 1);

    type('MOON');
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-thrusts', '2');
    expect(speed()).toBeCloseTo(LAUNCH_SPEED + thrustFor('SUN') + thrustFor('MOON'), 1);
  });

  it('a wrong key marks the letter and shakes the word, without failing it', () => {
    renderGame();
    startRound();
    press('x');
    expect(wordStates()).toEqual(['wrong', 'pending', 'pending']);
    expect(screen.getByTestId('active-word')).toHaveClass('animate-shake');
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'SUN');
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-thrusts', '0');
    type('SUN');
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'MOON');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('0');
  });

  it('the scenery scrolls past faster when the rocket is going faster', () => {
    renderGame();
    startRound();
    let before = sceneryOffset();
    advance(1000);
    const slow = sceneryOffset() - before;
    expect(slow).toBeGreaterThan(0);

    for (let i = 0; i < 4; i++) typeActiveWord();
    before = sceneryOffset();
    advance(1000);
    expect(sceneryOffset() - before).toBeGreaterThan(2 * slow);
  });

  it('flashes the new stage when the rocket reaches the Clouds', () => {
    renderGame();
    startRound();
    for (let s = 0; s < 20 && screen.getByTestId('sky').dataset.stage === 'Sky'; s++) {
      typeActiveWord();
      typeActiveWord();
      advance(1000);
    }
    expect(screen.getByTestId('sky')).toHaveAttribute('data-stage', 'Clouds');
    expect(screen.getByTestId('stage-flash')).toHaveTextContent('Clouds reached!');
  });

  it('shows a "Stalling! N s" countdown when the rocket slows right down', () => {
    renderGame();
    startRound();
    expect(screen.queryByTestId('stall-warning')).not.toBeInTheDocument();
    advance(7000); // coasting from launch speed, it stalls ~6.4s in
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-engine', 'stalling');
    expect(screen.getByTestId('stall-warning')).toHaveTextContent(/^Stalling! \d s$/);
    const first = stallSeconds();
    advance(2000);
    expect(stallSeconds()).toBe(first - 2);

    type('SUN'); // a thrust gets it flying again
    expect(screen.queryByTestId('stall-warning')).not.toBeInTheDocument();
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-engine', 'burning');
  });

  it('calls onComplete with endedBy "stall" after 5s of stalling', () => {
    const onComplete = renderGame();
    startRound();
    advance(12_000); // stalls ~6.4s in, plus 5s
    advance(600);    // results delay
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ endedBy: 'stall', wordsTyped: 0 }));
  });

  it('calls onComplete with endedBy "time" when the 60s run out', () => {
    const onComplete = renderGame();
    startRound();
    for (let t = 0; t < ROUND_MS; t += 1000) {
      typeActiveWord();
      advance(1000);
    }
    expect(onComplete).not.toHaveBeenCalled(); // waits a moment before the results
    advance(600);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ endedBy: 'time', wordsTyped: 60, accuracy: 100, bestStreak: 60 }),
    );
  });
});
