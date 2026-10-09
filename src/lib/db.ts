import { PGlite } from '@electric-sql/pglite';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { env } from './env';

export interface DbClient {
  query<T = any>(sqlText: string, params?: unknown[]): Promise<T[]>;
  queryOne<T = any>(sqlText: string, params?: unknown[]): Promise<T | null>;
  execute(sqlText: string, params?: unknown[]): Promise<number>;
}

class DatabaseManager implements DbClient {
  private pgliteInstance: PGlite | null = null;
  private pgPool: Pool | null = null;
  private isInitialized = false;

  private async ensureInitialized(): Promise<void> {
    if (this.isInitialized) return;

    if (env.DATABASE_URL && env.DATABASE_URL.startsWith('postgres')) {
      // Connect to external live PostgreSQL
      this.pgPool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      });
      await this.runMigrationsIfNeeded();
      this.isInitialized = true;
    } else {
      // Embedded PostgreSQL via PGlite
      let baseDir = process.cwd();
      try {
        const testDir = path.resolve(baseDir, '.data');
        if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
      } catch {
        baseDir = '/tmp';
      }

      const dataDir = path.resolve(baseDir, '.data/postgres');
      if (!fs.existsSync(dataDir)) {
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {}
      }

      try {
        this.pgliteInstance = new PGlite(dataDir);
        await this.pgliteInstance.waitReady;
      } catch {
        // If dataDir was locked or corrupted by previous unexpected process termination, recreate cleanly
        console.warn('[DB] Recreating clean embedded database instance...');
        try {
          fs.rmSync(dataDir, { recursive: true, force: true });
        } catch {}
        try {
          fs.mkdirSync(dataDir, { recursive: true });
        } catch {}
        this.pgliteInstance = new PGlite(dataDir);
        await this.pgliteInstance.waitReady;
      }
      await this.runMigrationsIfNeeded();
      this.isInitialized = true;
    }
  }

  private async runMigrationsIfNeeded(): Promise<void> {
    try {
      const migrationPath = path.resolve(
        process.cwd(),
        'prisma/migrations/20261005_init/migration.sql'
      );
      const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';

      if (this.pgPool) {
        const check = await this.pgPool.query(
          "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User';"
        );
        if ((check.rowCount || 0) === 0 && sql) {
          await this.pgPool.query(sql);
          console.log('[DB] Applied initial PostgreSQL schema migration to external pgPool.');
        }
      } else if (this.pgliteInstance) {
        const check = await this.pgliteInstance.query(
          "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User';"
        );
        if (check.rows.length === 0 && sql) {
          await this.pgliteInstance.exec(sql);
          console.log('[DB] Applied initial PostgreSQL schema migration to PGlite successfully.');
        }
      }
    } catch (err) {
      console.error('[DB] Migration verification error:', err);
    }
  }

  public async query<T = any>(sqlText: string, params: unknown[] = []): Promise<T[]> {
    await this.ensureInitialized();

    if (this.pgPool) {
      const res = await this.pgPool.query(sqlText, params);
      return res.rows as T[];
    } else if (this.pgliteInstance) {
      const res = await this.pgliteInstance.query(sqlText, params);
      return res.rows as T[];
    }
    throw new Error('Database client not initialized');
  }

  public async queryOne<T = any>(sqlText: string, params: unknown[] = []): Promise<T | null> {
    const rows = await this.query<T>(sqlText, params);
    return rows.length > 0 ? rows[0] : null;
  }

  public async execute(sqlText: string, params: unknown[] = []): Promise<number> {
    await this.ensureInitialized();

    if (this.pgPool) {
      const res = await this.pgPool.query(sqlText, params);
      return res.rowCount || 0;
    } else if (this.pgliteInstance) {
      const res = await this.pgliteInstance.query(sqlText, params);
      return res.affectedRows || res.rows.length || 0;
    }
    throw new Error('Database client not initialized');
  }

  public async transaction<T>(callback: (client: DbClient) => Promise<T>): Promise<T> {
    await this.ensureInitialized();

    if (this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        const txClient: DbClient = {
          query: async <R = unknown>(sql: string, params: unknown[] = []) => {
            const res = await client.query(sql, params);
            return res.rows as R[];
          },
          queryOne: async <R = unknown>(sql: string, params: unknown[] = []) => {
            const res = await client.query(sql, params);
            return res.rows.length > 0 ? (res.rows[0] as R) : null;
          },
          execute: async (sql: string, params: unknown[] = []) => {
            const res = await client.query(sql, params);
            return res.rowCount || 0;
          },
        };
        const result = await callback(txClient);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } else if (this.pgliteInstance) {
      // PGlite in-process transaction
      await this.pgliteInstance.exec('BEGIN');
      try {
        const result = await callback(this);
        await this.pgliteInstance.exec('COMMIT');
        return result;
      } catch (err) {
        await this.pgliteInstance.exec('ROLLBACK');
        throw err;
      }
    }

    throw new Error('Database client not initialized');
  }
}

export const db = new DatabaseManager();
