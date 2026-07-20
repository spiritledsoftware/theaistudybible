import * as schema from '@/core/database/schema';
import { env } from '@/core/env';
import { drizzle } from 'drizzle-orm/d1';

export const db = drizzle(env.DATABASE, { schema });
