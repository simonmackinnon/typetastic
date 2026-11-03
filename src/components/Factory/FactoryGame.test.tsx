import { render, screen, act, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import FactoryGame from './FactoryGame';
import { MAX_ORDERS, ROUND_MS, TICK_MS } from '../../hooks/useFactoryGame';

// random() === 0 -> every order in the first two thirds is a kite: SAIL, TAIL.
// Orders arrive at 0s, 6s, 11.8s, 17.5s...
function renderGame(onComplete = vi.fn()) {
  render(<FactoryGame onComplete={onComplete} random={() => 0} />);
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

/** Types every remaining part of the front order, reading them from the DOM. */
function buildFrontOrder() {
  for (let guard = 0; guard < 8 && screen.queryByTestId('active-part'); guard++) {
    const before = screen.getAllByTestId('order-ticket').length;
    type(screen.getByTestId('active-part').getAttribute('data-part')!);
    if (screen.queryAllByTestId('order-ticket').length < before) return;
  }
}

function startRound() {
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  advance(3000); // countdown; the first order arrives at once
}

function partStates() {
  return Array.from(screen.getByTestId('active-part').querySelectorAll('[data-state]')).map((el) =>
    el.getAttribute('data-state'),
  );
}

describe('FactoryGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a Start button before the round', () => {
    renderGame();
    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
    expect(screen.queryByTestId('assembly-line')).not.toBeInTheDocument();
  });

  it('autoStart skips the Start button and the first order arrives after the countdown', () => {
    render(<FactoryGame onComplete={vi.fn()} random={() => 0} autoStart />);
    expect(screen.queryByRole('button', { name: /start/i })).not.toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    advance(3000);
    expect(screen.getAllByTestId('order-ticket')).toHaveLength(1);
  });

  it('renders the HUD, the assembly line and the active order ticket', () => {
    renderGame();
    startRound();
    expect(screen.getByTestId('hud-time')).toHaveTextContent('1:00');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('0');
    expect(screen.getByTestId('hud-score')).toHaveAccessibleName('0 toys built');
    expect(screen.getByTestId('hud-combo')).toHaveTextContent('×0');
    expect(screen.getByTestId('toy-assembly')).toHaveAttribute('data-toy', 'kite');
    const ticket = screen.getByTestId('order-ticket');
    expect(ticket).toHaveAttribute('data-active', 'true');
    expect(within(ticket).getByText('Kite')).toBeInTheDocument();
    expect(screen.getByTestId('active-part')).toHaveAttribute('data-part', 'SAIL');
  });

  it('shows up to 3 order tickets, with only the front one active', () => {
    renderGame();
    startRound();
    advance(11_800);
    let tickets = screen.getAllByTestId('order-ticket');
    expect(tickets).toHaveLength(MAX_ORDERS);
    expect(tickets.map((t) => t.getAttribute('data-active'))).toEqual(['true', 'false', 'false']);
    advance(19_900 - 11_800); // a 4th is due at 17.5s but there's no room
    tickets = screen.getAllByTestId('order-ticket');
    expect(tickets).toHaveLength(MAX_ORDERS);
  });

  it('highlights the active part as it is typed and attaches it when finished', () => {
    renderGame();
    startRound();
    expect(partStates()).toEqual(['current', 'pending', 'pending', 'pending']);
    press('s');
    expect(partStates()).toEqual(['typed', 'current', 'pending', 'pending']);
    type('AIL');
    expect(screen.getByTestId('active-part')).toHaveAttribute('data-part', 'TAIL');
    const done = screen.getAllByTestId('part').filter((p) => p.getAttribute('data-state') === 'done');
    expect(done.map((p) => p.textContent)).toEqual(['SAIL']);
    expect(screen.getAllByTestId('attached-part').map((p) => p.textContent)).toEqual(['SAIL']);
  });

  it('finishing every part builds the toy and adds to the score', () => {
    renderGame();
    startRound();
    type('SAILTAIL');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1');
    expect(screen.getByTestId('hud-combo')).toHaveTextContent('×1');
    expect(screen.queryAllByTestId('order-ticket')).toHaveLength(0);
  });

  it('a wrong key shakes the part without failing the order', () => {
    renderGame();
    startRound();
    press('x');
    expect(partStates()[0]).toBe('wrong');
    expect(screen.getByTestId('active-part')).toHaveClass('animate-shake');
    expect(screen.getByTestId('active-part')).toHaveAttribute('data-part', 'SAIL');
    type('SAILTAIL');
    expect(screen.getByTestId('hud-score')).toHaveTextContent('1');
    expect(screen.getByTestId('hud-combo')).toHaveTextContent('×0'); // not a perfect order
  });

  it("turns an order's timer bar red in its last 3 seconds", () => {
    renderGame();
    startRound();
    advance(16_900); // the first order has 3.1s left
    expect(screen.getAllByTestId('order-timer')[0]).toHaveAttribute('data-urgent', 'false');
    advance(200);
    const timers = screen.getAllByTestId('order-timer');
    expect(timers[0]).toHaveAttribute('data-urgent', 'true');
    expect(timers[1]).toHaveAttribute('data-urgent', 'false');
  });

  it('a missed order flashes "Missed!" and clears from the line', () => {
    renderGame();
    startRound();
    press('s'); // start the first order, then let it run out at 20s
    advance(20_000);
    expect(screen.getByTestId('missed-flash')).toHaveTextContent('Missed!');
    expect(screen.getByTestId('active-part')).toHaveAttribute('data-part', 'SAIL'); // the next kite, fresh
    expect(partStates()[0]).toBe('current');
    expect(screen.getByTestId('hud-combo')).toHaveTextContent('×0');
  });

  it('a third perfect order in a row flashes the +3 s bonus', () => {
    renderGame();
    startRound();
    buildFrontOrder(); // 0s
    advance(6_000);
    buildFrontOrder(); // 6s
    expect(screen.queryByTestId('bonus-flash')).not.toBeInTheDocument();
    advance(5_800);
    buildFrontOrder(); // 11.8s: combo 3
    expect(screen.getByTestId('hud-combo')).toHaveTextContent('×3');
    expect(screen.getByTestId('bonus-flash')).toHaveTextContent('+3 s!');
  });

  it('calls onComplete with the round result when time runs out', () => {
    const onComplete = renderGame();
    startRound();
    for (let t = 0; t < ROUND_MS; t += TICK_MS) {
      if (screen.queryByTestId('active-part')) buildFrontOrder();
      advance(TICK_MS);
    }
    expect(onComplete).not.toHaveBeenCalled(); // waits for the last toy to roll off
    advance(600);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ ordersMissed: 0, accuracy: 100, score: expect.any(Number) }),
    );
    expect(onComplete.mock.calls[0][0].score).toBeGreaterThan(10);
  });
});
