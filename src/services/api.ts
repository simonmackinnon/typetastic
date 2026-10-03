import axios from 'axios';
import { getIdToken } from './auth';
import type { GameScore, LevelProgress } from '../types';

const BASE_URL = process.env.API_BASE_URL ?? '';

async function authHeaders() {
  const token = await getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProgress(): Promise<LevelProgress[]> {
  const headers = await authHeaders();
  const { data } = await axios.get<LevelProgress[]>(`${BASE_URL}/me/progress`, { headers });
  return data;
}

export async function saveProgress(
  levelId: string,
  result: Omit<LevelProgress, 'levelId'>,
): Promise<void> {
  const headers = await authHeaders();
  await axios.put(`${BASE_URL}/me/progress/${levelId}`, result, { headers });
}

export async function fetchBadges(): Promise<string[]> {
  const headers = await authHeaders();
  const { data } = await axios.get<{ badgeId: string }[]>(`${BASE_URL}/me/badges`, { headers });
  return data.map((b) => b.badgeId);
}

export async function unlockBadge(badgeId: string): Promise<void> {
  const headers = await authHeaders();
  await axios.post(`${BASE_URL}/me/badges/${badgeId}`, {}, { headers });
}

export interface GameRoundSubmission {
  score: number;
  streak: number;
  accuracy: number;
}

/** The player's stored best + running total for a game, or null if never played. */
export async function fetchGameScore(gameId: string): Promise<GameScore | null> {
  const headers = await authHeaders();
  try {
    const { data } = await axios.get<GameScore>(`${BASE_URL}/me/games/${gameId}/score`, { headers });
    return data;
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 404) return null;
    throw e;
  }
}

/** Records a round. The server keeps the best and adds to the running total. */
export async function saveGameScore(gameId: string, round: GameRoundSubmission): Promise<GameScore> {
  const headers = await authHeaders();
  const { data } = await axios.put<GameScore>(`${BASE_URL}/me/games/${gameId}/score`, round, { headers });
  return data;
}
