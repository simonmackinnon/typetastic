import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RocketsGamePage, { resultsHeadline } from './RocketsGamePage';
import type { RocketsRoundResult } from '../hooks/useRocketsGame';
import { ProgressContext } from '../context/ProgressContext';

// The game surface has its own tests (RocketsGame.test.tsx); here we stub it
// so we can drive the page's instructions -> play -> results flow directly.
let round: RocketsRoundResult;
const result = (r: Partial<RocketsRoundResult> = {}): RocketsRoundResult => ({
  score: 342, accuracy: 94, bestStreak: 11, wordsTyped: 37, stage: 3, endedBy: 'time', ...r,
});

vi.mock('../components/Rockets/RocketsGame', () => ({
  default: ({ onComplete }: { onComplete: (r: RocketsRoundResult) => void }) => (
    <div data-testid="rockets-game">
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
      <MemoryRouter initialEntries={['/games/rockets']}>
        <Routes>
          <Route path="/games/rockets" element={<RocketsGamePage />} />
        </Routes>
      </MemoryRouter>
    </ProgressContext.Provider>,
  );
}

function playRound(r: RocketsRoundResult) {
  round = r;
  fireEvent.click(screen.getByRole('button', { name: /start/i }));
  fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
}

describe('RocketsGamePage', () => {
  it('explains thrust, the stages and the 5s stall rule', () => {
    renderPage();
    const instructions = screen.getByTestId('rockets-instructions');
    expect(instructions).toHaveTextContent(/every space word you finish fires the engine/i);
    expect(instructions).toHaveTextContent(/stalls for 5 seconds/i);
    for (const stage of ['Sky', 'Clouds', 'Space', 'Satellites', 'Moon']) {
      expect(instructions).toHaveTextContent(stage);
    }
    expect(screen.getByRole('heading', { level: 1, name: /rockets/i })).toBeInTheDocument();
  });

  it('shows altitude, highest stage, words, accuracy and best streak on the results', () => {
    renderPage();
    playRound(result());
    expect(screen.getByTestId('result-score')).toHaveTextContent('342 km');
    expect(screen.getByTestId('result-stage')).toHaveTextContent('Satellites');
    expect(screen.getByTestId('result-words')).toHaveTextContent('37');
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('94%');
    expect(screen.getByTestId('result-streak')).toHaveTextContent('11');
    expect(screen.getByText('Rockets round complete')).toBeInTheDocument();
  });

  it('submits the round under the rockets game id', () => {
    renderPage();
    playRound(result());
    expect(submitGameScore).toHaveBeenCalledWith('rockets', result());
  });

  it('headlines an early ending "Stalled!"', () => {
    renderPage();
    playRound(result({ endedBy: 'stall', stage: 1, score: 80 }));
    expect(screen.getByRole('heading', { name: 'Stalled!' })).toBeInTheDocument();
  });

  it('headlines a round that reached the Moon "Moonshot!"', () => {
    renderPage();
    playRound(result({ stage: 4, score: 512 }));
    expect(screen.getByRole('heading', { name: 'Moonshot!' })).toBeInTheDocument();
  });
});

describe('resultsHeadline', () => {
  it('picks a headline from how the round went', () => {
    expect(resultsHeadline(result({ stage: 4, endedBy: 'time' }))).toBe('Moonshot!');
    expect(resultsHeadline(result({ stage: 4, endedBy: 'stall' }))).toBe('Moonshot!'); // reaching the Moon wins
    expect(resultsHeadline(result({ stage: 1, endedBy: 'stall' }))).toBe('Stalled!');
    expect(resultsHeadline(result({ stage: 2 }))).toBe('Into space!');
    expect(resultsHeadline(result({ stage: 1, score: 60 }))).toBe('Nice flying!');
    expect(resultsHeadline(result({ stage: 0, score: 0 }))).toBe('Keep practising!');
  });
});
