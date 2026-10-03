/**
 * TypeTastic — API Lambda
 *
 * Routes:
 *   GET  /me/progress              → list all level progress items
 *   PUT  /me/progress/:levelId     → save (upsert) level result
 *   GET  /me/badges                → list earned badges
 *   POST /me/badges/:badgeId       → mark badge earned
 *   GET  /me/profile               → get profile
 *   PUT  /me/profile               → update profile
 *   GET  /me/games/:gameId/score   → get best score + running total for a game (404 if never played)
 *   PUT  /me/games/:gameId/score   → add score to the running total; replace the best only if beaten
 *
 * Runtime: nodejs24.x — @aws-sdk/* included natively, no bundling needed.
 *
 * DynamoDB schema (single-table):
 *   PK userId  = Cognito sub
 *   SK dataKey = "profile"
 *               | "level#01" … "level#20"
 *               | "badge#first-keystroke" … etc.
 *               | "game#post-office#best" (one per allowlisted gameId)
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} = require('@aws-sdk/lib-dynamodb');

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE  = process.env.TABLE_NAME;

// ── Response helpers ──────────────────────────────────────────────────────────

const respond = (code, body) => ({
  statusCode: code,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const ok  = (body)      => respond(200, body);
const err = (code, msg) => respond(code, { error: msg });

const parseBody = (raw) => {
  try { return raw ? JSON.parse(raw) : {}; }
  catch { return {}; }
};

// ── Progress helpers ──────────────────────────────────────────────────────────

async function getProgress(userId) {
  const { Items = [] } = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'userId = :u AND begins_with(dataKey, :prefix)',
    ExpressionAttributeValues: { ':u': userId, ':prefix': 'level#' },
  }));
  return ok(
    Items.map((item) => ({
      levelId:      item.dataKey.replace('level#', ''),
      stars:        item.stars,
      bestAccuracy: item.bestAccuracy,
      bestWpm:      item.bestWpm,
      completedAt:  item.completedAt,
    })),
  );
}

async function saveProgress(userId, levelId, body) {
  const { stars, bestAccuracy, bestWpm, completedAt } = body;

  // Only update if the new result is better than existing
  const existing = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { userId, dataKey: `level#${levelId}` },
  }));

  const existingStars = existing.Item?.stars ?? 0;
  if (typeof stars !== 'number' || stars <= existingStars) {
    // Still allow saving if first time or same stars (updates bestWpm/accuracy)
    if (stars < existingStars) {
      return ok({ updated: false });
    }
  }

  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      userId,
      dataKey:      `level#${levelId}`,
      levelId,
      stars:        stars ?? 0,
      bestAccuracy: bestAccuracy ?? 0,
      bestWpm:      bestWpm ?? 0,
      completedAt:  completedAt ?? new Date().toISOString(),
    },
  }));
  return ok({ updated: true });
}

// ── Badge helpers ─────────────────────────────────────────────────────────────

async function getBadges(userId) {
  const { Items = [] } = await dynamo.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'userId = :u AND begins_with(dataKey, :prefix)',
    ExpressionAttributeValues: { ':u': userId, ':prefix': 'badge#' },
  }));
  return ok(
    Items.map((item) => ({
      badgeId:    item.dataKey.replace('badge#', ''),
      unlockedAt: item.unlockedAt,
    })),
  );
}

async function unlockBadge(userId, badgeId) {
  // Idempotent — safe to call multiple times
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      userId,
      dataKey:    `badge#${badgeId}`,
      badgeId,
      unlockedAt: new Date().toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(dataKey)',
  })).catch((e) => {
    // ConditionalCheckFailedException means badge already exists — that's fine
    if (e.name !== 'ConditionalCheckFailedException') throw e;
  });
  return ok({ unlocked: true });
}

// ── Profile helpers ───────────────────────────────────────────────────────────

async function getProfile(userId) {
  const { Item } = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { userId, dataKey: 'profile' },
  }));
  return ok(Item ?? { userId, displayName: null, createdAt: null });
}

async function updateProfile(userId, body) {
  const { displayName } = body;
  const existing = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { userId, dataKey: 'profile' },
  }));
  await dynamo.send(new PutCommand({
    TableName: TABLE,
    Item: {
      userId,
      dataKey:     'profile',
      displayName: displayName ?? null,
      createdAt:   existing.Item?.createdAt ?? new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    },
  }));
  return ok({ updated: true });
}

// ── Game score helpers ────────────────────────────────────────────────────────

// gameId comes from the client-supplied path, so it is checked against this
// allowlist before it is ever used to build a dataKey.
const GAME_IDS = new Set(['post-office']);

const gameKey = (gameId) => `game#${gameId}#best`;

const isCount = (n) => Number.isInteger(n) && n >= 0;

const toGameRecord = (gameId, item) => ({
  gameId,
  bestScore:          item.bestScore,
  bestStreak:         item.bestStreak,
  accuracy:           item.accuracy,
  totalParcelsRouted: item.totalParcelsRouted ?? 0,
  updatedAt:          item.updatedAt,
});

async function getGameScore(userId, gameId) {
  const { Item } = await dynamo.send(new GetCommand({
    TableName: TABLE,
    Key: { userId, dataKey: gameKey(gameId) },
  }));
  if (!Item || Item.bestScore === undefined) return err(404, 'Not found');
  return ok(toGameRecord(gameId, Item));
}

async function saveGameScore(userId, gameId, body) {
  const { score, streak, accuracy } = body;
  if (!isCount(score) || !isCount(streak) || typeof accuracy !== 'number' || accuracy < 0 || accuracy > 100) {
    return err(400, 'score and streak must be non-negative integers, accuracy 0-100');
  }
  const Key = { userId, dataKey: gameKey(gameId) };

  // Every round counts toward the running total, whether or not it's a new best.
  // ADD is atomic, so concurrent rounds can't lose each other's parcels.
  const { Attributes: afterTotal } = await dynamo.send(new UpdateCommand({
    TableName: TABLE,
    Key,
    UpdateExpression: 'ADD totalParcelsRouted :score',
    ExpressionAttributeValues: { ':score': score },
    ReturnValues: 'ALL_NEW',
  }));

  // Same only-if-better rule as saveProgress, but as a conditional write so two
  // concurrent submissions can't let a lower score overwrite a higher one.
  try {
    const { Attributes } = await dynamo.send(new UpdateCommand({
      TableName: TABLE,
      Key,
      UpdateExpression: 'SET gameId = :gameId, bestScore = :score, bestStreak = :streak, accuracy = :accuracy, updatedAt = :now',
      ConditionExpression: 'attribute_not_exists(bestScore) OR bestScore < :score',
      ExpressionAttributeValues: {
        ':gameId':   gameId,
        ':score':    score,
        ':streak':   streak,
        ':accuracy': accuracy,
        ':now':      new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    }));
    return ok({ updated: true, ...toGameRecord(gameId, Attributes) });
  } catch (e) {
    if (e.name !== 'ConditionalCheckFailedException') throw e;
    return ok({ updated: false, ...toGameRecord(gameId, afterTotal) });
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const method   = event.requestContext.http.method;
  const rawPath  = event.rawPath;
  const userId   = event.requestContext.authorizer?.jwt?.claims?.sub;

  if (!userId) return err(401, 'Unauthorised');

  const body = parseBody(event.body);

  // GET /me/progress
  if (method === 'GET' && rawPath === '/me/progress') {
    return getProgress(userId);
  }

  // PUT /me/progress/{levelId}
  const progressMatch = rawPath.match(/^\/me\/progress\/([^/]+)$/);
  if (method === 'PUT' && progressMatch) {
    return saveProgress(userId, progressMatch[1], body);
  }

  // GET /me/badges
  if (method === 'GET' && rawPath === '/me/badges') {
    return getBadges(userId);
  }

  // POST /me/badges/{badgeId}
  const badgeMatch = rawPath.match(/^\/me\/badges\/([^/]+)$/);
  if (method === 'POST' && badgeMatch) {
    return unlockBadge(userId, badgeMatch[1]);
  }

  // GET /me/profile
  if (method === 'GET' && rawPath === '/me/profile') {
    return getProfile(userId);
  }

  // PUT /me/profile
  if (method === 'PUT' && rawPath === '/me/profile') {
    return updateProfile(userId, body);
  }

  // GET|PUT /me/games/{gameId}/score
  const gameMatch = rawPath.match(/^\/me\/games\/([^/]+)\/score$/);
  if (gameMatch && (method === 'GET' || method === 'PUT')) {
    const gameId = gameMatch[1];
    if (!GAME_IDS.has(gameId)) return err(400, 'Unknown game');
    return method === 'GET'
      ? getGameScore(userId, gameId)
      : saveGameScore(userId, gameId, body);
  }

  return err(404, 'Not found');
};
