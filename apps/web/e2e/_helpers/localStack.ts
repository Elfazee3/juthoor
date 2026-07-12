import { execSync } from 'node:child_process';
import path from 'node:path';

export interface LocalStack {
  apiUrl: string;
  serviceKey: string;
}

/** Read API_URL + SERVICE_ROLE_KEY from the running local Supabase stack. */
export function localStack(): LocalStack {
  const databaseDir = path.resolve(__dirname, '..', '..', '..', 'database');
  const out = execSync('pnpm exec supabase status --output env', {
    cwd: databaseDir,
    encoding: 'utf-8',
  });
  const env: Record<string, string> = {};
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Z_]+)="(.+)"$/);
    if (m) env[m[1]] = m[2];
  }
  if (!env.API_URL || !env.SERVICE_ROLE_KEY) {
    throw new Error('[e2e] Could not read API_URL / SERVICE_ROLE_KEY from supabase status');
  }
  return { apiUrl: env.API_URL, serviceKey: env.SERVICE_ROLE_KEY };
}

/** Service-role headers (bypass RLS) for PostgREST + GoTrue admin calls. */
export function serviceHeaders(serviceKey: string): Record<string, string> {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
}
