import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PostOfficeGamePage from './PostOfficeGamePage';
import type { PostOfficeRoundResult } from '../hooks/usePostOfficeGame';

// The game surface has its own tests (PostOfficeGame.test.tsx); here we stub it
// so we can drive the page's instructions -> play -> results flow directly.
const ROUND: PostOfficeRoundResult = { score: 12, parcelsMissed: 3, accuracy: 91, bestStreak: 7 };
const gameMounts = vi.fn();

vi.mock('../components/PostOffice/PostOfficeGame', () => ({
  default: ({ onComplete, autoStart }: { onComplete: (r: PostOfficeRoundResult) => void; autoStart?: boolean }) => {
    gameMounts(autoStart);
    return (
      <div data-testid="post-office-game">
        <button onClick={() => onComplete(ROUND)}>finish round</button>
      </div>
    );
  },
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/games/post-office']}>
      <Routes>
        <Route path="/games/post-office" element={<PostOfficeGamePage />} />
        <Route path="/games" element={<div>games hub</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PostOfficeGamePage', () => {
  it('starts on the instructions screen', () => {
    renderPage();
    expect(screen.getByTestId('post-office-instructions')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /how to play/i })).toBeInTheDocument();
    expect(screen.queryByTestId('post-office-game')).not.toBeInTheDocument();
  });

  it('includes the keyboard-required gate for mobile', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /need a keyboard to play/i })).toBeInTheDocument();
  });

  it('Start launches the game straight into its countdown', () => {
    gameMounts.mockClear();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    expect(screen.getByTestId('post-office-game')).toBeInTheDocument();
    expect(screen.queryByTestId('post-office-instructions')).not.toBeInTheDocument();
    expect(gameMounts).toHaveBeenCalledWith(true);
  });

  it('shows the session stats on the results screen when the round ends', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
    expect(screen.getByRole('heading', { name: /great sorting/i })).toBeInTheDocument();
    expect(screen.getByTestId('result-score')).toHaveTextContent('12');
    expect(screen.getByTestId('result-missed')).toHaveTextContent('3');
    expect(screen.getByTestId('result-accuracy')).toHaveTextContent('91%');
    expect(screen.getByTestId('result-streak')).toHaveTextContent('7');
  });

  it('Play Again starts a fresh round', () => {
    gameMounts.mockClear();
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
    fireEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(screen.getByTestId('post-office-game')).toBeInTheDocument();
    expect(gameMounts).toHaveBeenCalledTimes(2);
  });

  it('Back to Games returns to the hub', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /start/i }));
    fireEvent.click(screen.getByRole('button', { name: /finish round/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to games/i }));
    expect(screen.getByText('games hub')).toBeInTheDocument();
  });
});
