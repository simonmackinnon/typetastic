import { render, screen, act, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RocketsGame from './RocketsGame';
import { FUEL_START, FUEL_PER_LETTER, DRAIN_PER_S, ROUND_MS } from '../../hooks/useRocketsGame';

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

const fuel = () => Number(screen.getByTestId('fuel-gauge').getAttribute('aria-valuenow'));

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

  it('renders the sky, rocket, HUD, fuel gauge and words once playing', () => {
    renderGame();
    startRound();
    expect(screen.getByTestId('sky')).toHaveAttribute('data-stage', 'Sky');
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-engine', 'burning');
    expect(screen.getByTestId('hud-time')).toHaveTextContent('1:00');
    expect(screen.getByTestId('hud-km')).toHaveTextContent('0 km');
    expect(screen.getByTestId('hud-km')).toHaveAccessibleName('Altitude 0 kilometres');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('0');
    expect(screen.getByRole('meter', { name: 'Fuel' })).toHaveAttribute('aria-valuenow', String(FUEL_START));
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

  it('a wrong key marks the letter and shakes the word, without failing it', () => {
    renderGame();
    startRound();
    press('x');
    expect(wordStates()).toEqual(['wrong', 'pending', 'pending']);
    expect(screen.getByTestId('active-word')).toHaveClass('animate-shake');
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'SUN');
    type('SUN');
    expect(screen.getByTestId('active-word')).toHaveAttribute('data-word', 'MOON');
    expect(screen.getByTestId('hud-streak')).toHaveTextContent('0');
  });

  it('the fuel gauge rises with correct letters and drains over time', () => {
    renderGame();
    startRound();
    press('s');
    expect(fuel()).toBe(FUEL_START + FUEL_PER_LETTER);
    advance(1000);
    expect(fuel()).toBe(FUEL_START + FUEL_PER_LETTER - DRAIN_PER_S);
    expect(Number(screen.getByTestId('hud-km').textContent!.replace(/\D/g, ''))).toBeGreaterThan(0);
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

  it('shows a "Refuel! N s" countdown with an empty tank', () => {
    renderGame();
    startRound();
    expect(screen.queryByTestId('refuel-warning')).not.toBeInTheDocument();
    advance(7000); // the tank empties at 6.7s
    expect(fuel()).toBe(0);
    expect(screen.getByTestId('rocket')).toHaveAttribute('data-engine', 'sputtering');
    expect(screen.getByTestId('refuel-warning')).toHaveTextContent('Refuel! 5 s');
    advance(2000);
    expect(screen.getByTestId('refuel-warning')).toHaveTextContent('Refuel! 3 s');

    press('s'); // refuels
    expect(screen.queryByTestId('refuel-warning')).not.toBeInTheDocument();
  });

  it('calls onComplete with endedBy "fuel" after 5s on an empty tank', () => {
    const onComplete = renderGame();
    startRound();
    advance(11_600); // empty at 6.7s, plus 5s
    advance(600);    // results delay
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ endedBy: 'fuel', wordsTyped: 0 }));
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
