import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type PromoteAdminInput = {
  database: string;
  email: string;
  stage: string;
  confirmation: string;
};

function escapeSql(value: string): string {
  return value.replaceAll("'", "''");
}

function firstResult(output: string): Record<string, unknown> | undefined {
  const payload: unknown = JSON.parse(output);
  if (!Array.isArray(payload)) return undefined;
  const execution = payload[0];
  if (!execution || typeof execution !== 'object' || !('results' in execution)) return undefined;
  const { results } = execution;
  if (!Array.isArray(results)) return undefined;
  const result = results[0];
  return result && typeof result === 'object' ? result : undefined;
}

function executeD1(database: string, statement: string) {
  return execFileAsync('wrangler', [
    'd1',
    'execute',
    database,
    '--remote',
    '--json',
    '--command',
    statement,
  ]);
}

export async function promoteExistingAccount({
  database,
  email,
  stage,
  confirmation,
}: PromoteAdminInput): Promise<void> {
  if (stage !== 'production') {
    throw new Error('Administrator promotion is restricted to the production stage');
  }

  const expectedConfirmation = `PROMOTE ${email}`;
  if (confirmation !== expectedConfirmation) {
    throw new Error(`Confirmation must exactly match: ${expectedConfirmation}`);
  }

  const escapedEmail = escapeSql(email);
  const lookup = await executeD1(
    database,
    `SELECT id, email FROM users WHERE email = '${escapedEmail}' LIMIT 1`,
  );
  const account = firstResult(lookup.stdout);
  if (!account || typeof account.id !== 'string' || typeof account.email !== 'string') {
    throw new Error(`No existing Account found for ${email}`);
  }

  await executeD1(
    database,
    `INSERT INTO users_to_roles (user_id, role_id) VALUES ('${escapeSql(account.id)}', 'admin') ON CONFLICT DO NOTHING`,
  );

  console.info(
    JSON.stringify({
      action: 'account.promote-admin',
      accountId: account.id,
      email: account.email,
      stage,
      occurredAt: new Date().toISOString(),
    }),
  );
}
