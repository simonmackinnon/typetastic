import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import GameFlowPage, { formatUnit } from './GameFlowPage';
import { ProgressContext } from '../../context/ProgressContext';
import type { GameRoundResult, GameScore } from '../../types';

// A stub game so the shell's instructions -> play -> results flow can be
// driven directly (same pattern as PostOfficeGamePage.test.tsx). Rockets is
// used because its unit ("km") differs from Post Office's.
let nextScore = 12;
const gameMounts = vi.fn();

function StubGame({ onComplete }: { onComplete: (r: GameRoundResult) => void }) {
  gameMounts();
  return (
    <div data-testid="stub-game">
      <button onClick={() => onComplete({ score: nextScore, accuracy: 88, bestStreak: 5 })}>finish round</button>
    </div>
  );
}

let mockUser: { sub: string; email: string } | null = null;
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const submitGameScore = vi.fn();

function renderShell({ user = null, saved, gameId = 'rockets' }: {
  user?: typeof mockUser; saved?: GameScore; gameId?: 'rockets' | 'factories';
} = {}) {
  mockUser = user;
  submitGameScore.mockClear();
  gameMounts.mockClear();
  const ctx = { gameScores: saved ? { [gameId]: saved } : {}, submitGameScore };
  return render(
    // @ts-expect-error partial context for testing
    <ProgressContext.Provider value={ctx}>
      <MemoryRouter initialEntries={['/games/stub']}>
        <Routes>
          <Route
            path="/games/stub"
            element={
              <GameFlowPage
                gameId={gameId}
                instructions={<p>stub instructions</p>}
                renderGame={({ onComplete }) => <StubGame onComplete={onComplete} />}
                resultStats={(r) => [
                  { id: 'score', label: 'Altitude', value: r.score, Icon: Trophy, color: 'text-green-600', bg: 'bg-green-50' },
                ]}
                headline={(r) => (r.score > 10 ? 'Liftoff!' : 'Try again!')}
              />
            }
          />
          <Route path="/games" element={<div>games hub</div>} />
          <Route path="/tutorials" element={<div>tutorials</div>} />
        </Routes>
      </MemoryRouter>
    </ProgressContext.Provider>,
  );
}

const SIGNED_IN = { sub: 'user-1', email: 'kid@example.com' };
const saved = (bestScore: number): GameScore => ({ bestScore, bestStreak: 4, accuracy: 90, totalScore: 30 });

function playRound(score = 12) {
  nextScore = score;
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
}

describe('formatUnit', () => {
  it('uses the singular for exactly one and the plural otherwise', () => {
    const unit = { one: 'toy', many: 'toys' };
    expect(formatUnit(1, unit)).toBe('1 toy');
    expect(formatUnit(0, unit)).toBe('0 toys');
    expect(formatUnit(7, unit)).toBe('7 toys');
  });
});

describe('GameFlowPage', () => {
  it('starts on the instructions screen with the game name from the registry', () => {
    renderShell();
    expect(screen.getByTestId('rockets-instructions')).toHaveTextContent('stub instructions');
    expect(screen.getByRole('heading', { level: 1, name: /rockets/i })).toBeInTheDocument();
    expect(screen.queryByTestId('stub-game')).not.toBeInTheDocument();
  });

  it('runs instructions -> play -> results with the game-specific headline and stats', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.getByTestId('stub-game')).toBeInTheDocument();
    expect(screen.queryByTestId('rockets-instructions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
    expect(screen.getByRole('heading', { name: 'Liftoff!' })).toBeInTheDocument();
    expect(screen.getByText('Rockets round complete')).toBeInTheDocument();
    expect(screen.getByTestId('result-score')).toHaveTextContent('12');
  });

  it('Play Again mounts a fresh game', () => {
    renderShell();
    playRound();
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(screen.getByTestId('stub-game')).toBeInTheDocument();
    expect(gameMounts).toHaveBeenCalledTimes(2);
  });

  it('Back to Games returns to the hub from the results', () => {
    renderShell();
    playRound();
    fireEvent.click(screen.getByRole('button', { name: /back to games/i }));
    expect(screen.getByText('games hub')).toBeInTheDocument();
  });

  it('Back in the header returns to the hub', () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: /^← back$/i }));
    expect(screen.getByText('games hub')).toBeInTheDocument();
  });

  it('includes the keyboard-required gate for phones, linking to tutorials', () => {
    renderShell();
    expect(screen.getByRole('heading', { name: /need a keyboard to play/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /browse tutorials/i }));
    expect(screen.getByText('tutorials')).toBeInTheDocument();
  });

  it('submits the round result under its game id', () => {
    renderShell({ gameId: 'factories' });
    playRound(4);
    expect(submitGameScore).toHaveBeenCalledWith('factories', { score: 4, accuracy: 88, bestStreak: 5 });
  });

  it('guests see no saved best or personal-best comparison', () => {
    renderShell({ saved: saved(10) });
    expect(screen.queryByTestId('saved-best')).not.toBeInTheDocument();
    playRound();
    expect(screen.queryByTestId('personal-best')).not.toBeInTheDocument();
  });

  it("signed-in players see their saved best in the game's unit", () => {
    renderShell({ user: SIGNED_IN, saved: saved(240) });
    expect(screen.getByTestId('saved-best')).toHaveTextContent('Your best: 240 km');
  });

  it('signed-in: first ever round says the score was saved', () => {
    renderShell({ user: SIGNED_IN });
    playRound(12);
    expect(screen.getByTestId('personal-best')).toHaveTextContent('First score saved: 12!');
  });

  it('signed-in: beating the saved best shows a new personal best', () => {
    renderShell({ user: SIGNED_IN, saved: saved(10) });
    playRound(12);
    expect(screen.getByTestId('personal-best')).toHaveTextContent('New personal best! (was 10)');
  });

  it('signed-in: not beating the best names it in the plural unit', () => {
    renderShell({ gameId: 'factories', user: SIGNED_IN, saved: saved(15) });
    playRound(3);
    expect(screen.getByTestId('personal-best')).toHaveTextContent('Your best is 15 toys. Keep going to beat it!');
  });

  it('signed-in: not beating the best names it in the singular unit', () => {
    renderShell({ gameId: 'factories', user: SIGNED_IN, saved: saved(1) });
    playRound(0);
    expect(screen.getByTestId('personal-best')).toHaveTextContent('Your best is 1 toy. Keep going to beat it!');
  });
});
