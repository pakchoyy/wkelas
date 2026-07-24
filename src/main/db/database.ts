import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { MIGRATIONS } from './schema'

class Database {
  private db: SqlJsDatabase | null = null

  async init() {
    const SQL = await initSqlJs()
    this.db = new SQL.Database()
    this.runMigrations()
  }

  private runMigrations() {
    for (const migration of MIGRATIONS) {
      this.db!.run(migration.sql)
    }
  }

  getDb(): SqlJsDatabase {
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }

  exec(sql: string, params?: any[]) {
    if (params) {
      return this.getDb().run(sql, params)
    }
    return this.getDb().run(sql)
  }

  query(sql: string, params?: any[]): any[] {
    const stmt = this.getDb().prepare(sql)
    if (params) stmt.bind(params)
    const results: any[] = []
    while (stmt.step()) {
      results.push(stmt.getAsObject())
    }
    stmt.free()
    return results
  }

  queryOne(sql: string, params?: any[]): any | null {
    const results = this.query(sql, params)
    return results.length > 0 ? results[0] : null
  }

  close() {
    if (this.db) {
      this.db.run('PRAGMA wal_checkpoint(TRUNCATE)')
      this.db.close()
      this.db = null
    }
  }

  async replaceWith(data: Uint8Array) {
    const SQL = await initSqlJs()
    this.db = new SQL.Database(data)
  }
}

export const db = new Database()
