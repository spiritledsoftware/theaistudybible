import { db } from '@/core/database';
import { roles } from '@/core/database/schema';
import { sql } from 'drizzle-orm';

async function createInitialRoles() {
  console.log('Creating initial roles');

  await db
    .insert(roles)
    .values([
      { id: 'admin', name: 'Administrators' },
      { id: 'user', name: 'Readers' },
    ])
    .onConflictDoUpdate({
      target: roles.id,
      set: { name: sql`excluded.name` },
    });

  console.log('Initial roles created');
}

export const seedDatabase = async () => {
  console.log('Seeding non-sensitive reference data');
  await createInitialRoles();
  console.log('Database seeding complete');
};
