import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import GamesHubPage from './GamesHubPage';

const COMING_SOON = ['rockets', 'cars', 'trains', 'factories'];

function renderHub() {
  return render(
    <MemoryRouter initialEntries={['/games']}>
      <Routes>
        <Route path="/games" element={<GamesHubPage />} />
        <Route path="*" element={<div>navigated away</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('GamesHubPage', () => {
  it('renders the heading and all 5 game cards', () => {
    renderHub();
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument();
    expect(screen.getByTestId('game-post-office')).toBeInTheDocument();
    for (const id of COMING_SOON) {
      expect(screen.getByTestId(`game-${id}`)).toBeInTheDocument();
    }
  });

  it('Post Office card links to /games/post-office', () => {
    renderHub();
    const card = screen.getByTestId('game-post-office');
    expect(card.tagName).toBe('A');
    expect(card).toHaveAttribute('href', '/games/post-office');
    expect(card).not.toHaveAttribute('aria-disabled');
  });

  it('coming-soon cards are disabled, not links, and labelled', () => {
    renderHub();
    for (const id of COMING_SOON) {
      const card = screen.getByTestId(`game-${id}`);
      expect(card.tagName).not.toBe('A');
      expect(card).not.toHaveAttribute('href');
      expect(card).toHaveAttribute('aria-disabled', 'true');
      expect(card).toHaveTextContent(/coming soon/i);
    }
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('clicking a coming-soon card does not navigate', async () => {
    renderHub();
    await userEvent.click(screen.getByTestId('game-rockets'));
    expect(screen.queryByText('navigated away')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Games' })).toBeInTheDocument();
  });
});
