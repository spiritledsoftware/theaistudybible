import { createId } from '@/core/utils/id';
import { formatISO, parseISO } from 'date-fns';
import { type Column, type SQL, getTableColumns, sql } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';
import { type SQLiteTable, customType, text } from 'drizzle-orm/sqlite-core';

export const timestamp = customType<{
  data: Date;
  driverData: string;
}>({
  dataType: () => 'text',
  toDriver: (value) => formatISO(value),
  fromDriver: (value) => parseISO(value),
});

const createdAt = timestamp('created_at')
  .notNull()
  .$defaultFn(() => new Date());
const updatedAt = timestamp('updated_at')
  .notNull()
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => new Date());
export const baseModel = {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  createdAt,
  updatedAt,
};

export const baseModelNoId = {
  createdAt,
  updatedAt,
};

export const buildConflictUpdateColumns = <
  T extends PgTable | SQLiteTable,
  Q extends keyof T['_']['columns'],
>(
  table: T,
  columns: Q[],
) => {
  const cls = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column].name;
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>,
  );
};

/** D1 rejects any statement with more than 100 bound parameters. */
export const D1_MAX_BOUND_PARAMETERS = 100;

/**
 * Rows one multi-row insert (or upsert) into `table` can carry: every column
 * binds one parameter per row, and an upsert's SET binds one per `$onUpdateFn` column.
 */
export const maxInsertRows = (table: SQLiteTable) => {
  const columns = Object.values(getTableColumns(table));
  const onUpdate = columns.filter((column) => column.onUpdateFn).length;
  return Math.floor((D1_MAX_BOUND_PARAMETERS - onUpdate) / columns.length);
};

export const ilike = (column: Column, value: string) => sql`LOWER(${column}) LIKE LOWER(${value})`;
