/**
 * In-memory fake of the DynamoDB document client for Lambda-level integration
 * tests, plus a helper that loads lambda/handler.js the way Lambda does.
 *
 * The fake keeps state across calls, so multi-request flows behave like they
 * would against the table. It supports only the expressions handler.js uses;
 * anything else throws so a handler change can't silently pass against a
 * too-lenient fake.
 */
import { createRequire } from 'node:module';
import { vi } from 'vitest';

const require = createRequire(import.meta.url);

// Load the SDK through CommonJS, exactly as handler.js does, so the prototype
// we stub is the same one the handler uses.
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } =
  require('@aws-sdk/lib-dynamodb');

export const TEST_TABLE = 'tt-user-data-test';

export type Item = Record<string, unknown> & { userId: string; dataKey: string };

export const keyOf = (userId: string, dataKey: string) => `${userId}|${dataKey}`;

function conditionalCheckFailed(): Error {
  const e = new Error('The conditional request failed');
  e.name = 'ConditionalCheckFailedException';
  return e;
}

function conditionHolds(expr: string, existing: Item | undefined, values: Record<string, unknown> = {}): boolean {
  switch (expr) {
    case 'attribute_not_exists(dataKey)':
      return !existing;
    case 'attribute_not_exists(dataKey) OR bestScore < :score':
      return !existing || (existing.bestScore as number) < (values[':score'] as number);
    case 'attribute_not_exists(bestScore) OR bestScore < :score':
      return existing?.bestScore === undefined || (existing.bestScore as number) < (values[':score'] as number);
    case 'attribute_exists(totalParcelsRouted) AND attribute_not_exists(totalScore)':
      return existing?.totalParcelsRouted !== undefined && existing?.totalScore === undefined;
    default:
      throw new Error(`Fake DynamoDB: unsupported ConditionExpression "${expr}"`);
  }
}

function applyUpdate(expr: string, item: Item, values: Record<string, unknown>): Item {
  const add = expr.match(/^ADD (\w+) (:\w+)$/);
  if (add) {
    const [, attr, placeholder] = add;
    return { ...item, [attr]: ((item[attr] as number) ?? 0) + (values[placeholder] as number) };
  }
  // SET a = :val[, b = otherAttr …] [REMOVE c[, d …]]
  const set = expr.match(/^SET (.+?)(?: REMOVE (.+))?$/);
  if (set) {
    const next = { ...item };
    for (const assignment of set[1].split(',')) {
      const m = assignment.trim().match(/^(\w+) = (:?\w+)$/);
      if (!m) throw new Error(`Fake DynamoDB: unsupported SET clause "${assignment}"`);
      next[m[1]] = m[2].startsWith(':') ? values[m[2]] : item[m[2]];
    }
    for (const attr of set[2]?.split(',') ?? []) delete next[attr.trim()];
    return next;
  }
  throw new Error(`Fake DynamoDB: unsupported UpdateExpression "${expr}"`);
}

/** Installs the fake for the current test file and returns its backing table. */
export function installFakeDynamo() {
  const table = new Map<string, Item>();

  const spy = vi.spyOn(DynamoDBDocumentClient.prototype, 'send').mockImplementation(async (command: unknown) => {
    const { input } = command as { input: Record<string, any> };
    if (input.TableName !== TEST_TABLE) throw new Error(`Fake DynamoDB: unexpected table ${input.TableName}`);

    if (command instanceof GetCommand) {
      return { Item: table.get(keyOf(input.Key.userId, input.Key.dataKey)) };
    }
    if (command instanceof PutCommand) {
      const item = input.Item as Item;
      const existing = table.get(keyOf(item.userId, item.dataKey));
      if (input.ConditionExpression && !conditionHolds(input.ConditionExpression, existing, input.ExpressionAttributeValues)) {
        throw conditionalCheckFailed();
      }
      table.set(keyOf(item.userId, item.dataKey), { ...item });
      return {};
    }
    if (command instanceof UpdateCommand) {
      const k = keyOf(input.Key.userId, input.Key.dataKey);
      const existing = table.get(k);
      if (input.ConditionExpression && !conditionHolds(input.ConditionExpression, existing, input.ExpressionAttributeValues)) {
        throw conditionalCheckFailed();
      }
      const updated = applyUpdate(input.UpdateExpression, existing ?? { ...input.Key }, input.ExpressionAttributeValues ?? {});
      table.set(k, updated);
      return input.ReturnValues === 'ALL_NEW' ? { Attributes: { ...updated } } : {};
    }
    if (command instanceof QueryCommand) {
      const { ':u': userId, ':prefix': prefix } = input.ExpressionAttributeValues;
      const Items = [...table.values()].filter((i) => i.userId === userId && i.dataKey.startsWith(prefix));
      return { Items };
    }
    throw new Error(`Fake DynamoDB: unsupported command ${(command as object).constructor.name}`);
  });

  return { table, restore: () => spy.mockRestore() };
}

export type HandlerResponse = { statusCode: number; body: string };
export type HandlerEvent = {
  rawPath: string;
  requestContext: { http: { method: string }; authorizer?: { jwt: { claims: { sub: string } } } };
  body?: string;
};

/** Loads lambda/handler.js as CommonJS (as Lambda does) against the test table. */
export function loadHandler(): (event: HandlerEvent) => Promise<HandlerResponse> {
  process.env.TABLE_NAME = TEST_TABLE;
  return require('../../lambda/handler.js').handler;
}
