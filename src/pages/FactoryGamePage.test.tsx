import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import FactoryGamePage, { resultsHeadline } from './FactoryGamePage';
import type { FactoryRoundResult } from '../hooks/useFactoryGame';
import { ProgressContext } from '../context/ProgressContext';

// The game surface has its own tests (FactoryGame.test.tsx); here we stub it
// so we can drive the page's instructions -> play -> results flow directly.
let round: FactoryRoundResult;
const result = (r: Partial<FactoryRoundResult> = {}): FactoryRoundResult => ({
  score: 8, accuracy: 93, bestStreak: 4, ordersMissed: 2, partsBuilt: 23, ...r,
});

vi.mock('../components/Factory/FactoryGame', () => ({
  default: ({ onComplete }: { onComplete: (r: FactoryRoundResult) => void }) => (
    <div data-testid="factory-game">
      <button onClick={() => onComplete(round)}>finish round</button>
    </div>
  ),
}));

vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));

const submitGameScore = vi.fn();

function renderPage() {
  submitGameScore.mockClear();
  return render(
    // @ts-expect-error partial context for testing
    <ProgressContext.Provider value={{ gameScores: {}, submitGameScore }}>
      <MemoryRouter initialEntries={['/games/factories']}>
        <Routes>
          <Route path="/games/factories" element={<FactoryGamePage />} />
        </Routes>
      </MemoryRouter>
    </ProgressContext.Provider>,
  );
}

function playRound(r: FactoryRoundResult) {
  round = r;
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
}

describe('FactoryGamePage', () => {
  it('explains orders, parts in order, timers and the combo bonus', () => {
    renderPage();
    const instructions = screen.getByTestId('factories-instructions');
    expect(instructions).toHaveTextContent(/orders arrive/i);
    expect(instructions).toHaveTextContent(/type each part in order/i);
    expect(instructions).toHaveTextContent(/every order has a timer/i);
    expect(instructions).toHaveTextContent(/3 toys in a row with no mistakes and the next order gets 3 extra seconds/i);
    expect(screen.getByRole('heading', { level: 1, name: /factories/i })).toBeInTheDocument();
  });

  it('shows toys built, orders missed, parts built, accuracy and best combo on the results', () => {
    renderPage();
    playRound(result());
    expect(screen.getByTestId('result-score')).toHaveTextContent('8');
    expect(screen.getByTestId('result-missed')).toHaveTextContent('2');
    expect(screen.getByTestId('result-parts')).toHaveTextContent('23');
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('93%');
    expect(screen.getByTestId('result-streak')).toHaveTextContent('4');
    expect(screen.getByText('Factories round complete')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Busy builder!' })).toBeInTheDocument();
  });

  it('submits the round under the factories game id', () => {
    renderPage();
    playRound(result());
    expect(submitGameScore).toHaveBeenCalledWith('factories', result());
  });
});

describe('resultsHeadline', () => {
  it('depends on the number of toys built', () => {
    expect(resultsHeadline(result({ score: 12 }))).toBe('Toy tycoon!');
    expect(resultsHeadline(result({ score: 10 }))).toBe('Toy tycoon!');
    expect(resultsHeadline(result({ score: 9 }))).toBe('Busy builder!');
    expect(resultsHeadline(result({ score: 6 }))).toBe('Busy builder!');
    expect(resultsHeadline(result({ score: 1 }))).toBe('Nice building!');
    expect(resultsHeadline(result({ score: 0 }))).toBe('Keep practising!');
  });
});
