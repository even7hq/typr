import fs from "fs";
import path from "path";
import { randomUUID } from "node:crypto";

import type Database from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";

import type { LogWalStream } from "./LogWalStream";

/**
 * One row in `wal_entries`.
 */
export interface LogWalEntryRow {
    id: string;
    stream: string;
    kind: string;
    at: string;
    nodeId: string | null;
    payload: string;
    attempts: number | null;
    maxAttempts: number | null;
    nextRetryAt: string | null;
}

/**
 * Input for inserting a WAL row.
 */
export interface LogWalInsertRow {
    stream: LogWalStream;
    kind: string;
    at: string;
    nodeId: string | null;
    payload: string;
    attempts: number;
    maxAttempts: number;
    nextRetryAt: string;
}

/**
 * SQLite-backed store for OTLP log WAL rows (one file per path).
 */
export class LogWalDatabase {
    private static readonly instances = new Map<string, LogWalDatabase>();

    private readonly db: Database.Database;

    /**
     * Opens or reuses a database for the given absolute path.
     *
     * @param dbPath Absolute SQLite file path.
     * @returns Shared instance for that path.
     */
    static open(dbPath: string): LogWalDatabase {
        const resolved = path.resolve(dbPath);
        const existing = LogWalDatabase.instances.get(resolved);

        if (existing) {
            return existing;
        }

        const created = new LogWalDatabase(resolved);

        LogWalDatabase.instances.set(resolved, created);

        return created;
    }

    /**
     * Closes every open WAL database (tests).
     *
     * @returns Nothing.
     */
    static closeAllForTests(): void {
        for (const instance of LogWalDatabase.instances.values()) {
            instance.db.close();
        }

        LogWalDatabase.instances.clear();
    }

    /**
     * @param dbPath Absolute SQLite file path.
     */
    private constructor(dbPath: string) {
        const dir = path.dirname(dbPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new BetterSqlite3(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.ensureSchema();
    }

    /**
     * Creates tables and indexes when missing.
     *
     * @returns Nothing.
     */
    private ensureSchema(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS wal_entries (
                id TEXT PRIMARY KEY NOT NULL,
                stream TEXT NOT NULL,
                kind TEXT NOT NULL,
                at TEXT NOT NULL,
                nodeId TEXT,
                payload TEXT NOT NULL,
                attempts INTEGER,
                maxAttempts INTEGER,
                nextRetryAt TEXT
            );
            CREATE INDEX IF NOT EXISTS we_stream_at ON wal_entries(stream, at);
            CREATE INDEX IF NOT EXISTS we_next_retry_at ON wal_entries(nextRetryAt);
            CREATE INDEX IF NOT EXISTS we_stream_nextRetryAt ON wal_entries(stream, nextRetryAt);
        `);
    }

    /**
     * Counts backlog rows with a pending retry for a stream.
     *
     * @param stream WAL stream id.
     * @returns Row count.
     */
    countPending(stream: LogWalStream): number {
        const row = this.db.prepare(
            "SELECT COUNT(*) AS total FROM wal_entries WHERE stream = ? AND nextRetryAt IS NOT NULL"
        ).get(stream) as { total: number };

        return row.total;
    }

    /**
     * Inserts many rows in one transaction.
     *
     * @param rows Rows to insert.
     * @returns Nothing.
     */
    insertBatch(rows: LogWalInsertRow[]): void {
        if (rows.length === 0) {
            return;
        }

        const insert = this.db.prepare(`
            INSERT INTO wal_entries (
                id, stream, kind, at, nodeId, payload, attempts, maxAttempts, nextRetryAt
            ) VALUES (
                @id, @stream, @kind, @at, @nodeId, @payload, @attempts, @maxAttempts, @nextRetryAt
            )
        `);

        const run = this.db.transaction((batch: LogWalInsertRow[]) => {
            for (const entry of batch) {
                insert.run({
                    id: randomUUID(),
                    stream: entry.stream,
                    kind: entry.kind,
                    at: entry.at,
                    nodeId: entry.nodeId,
                    payload: entry.payload,
                    attempts: entry.attempts,
                    maxAttempts: entry.maxAttempts,
                    nextRetryAt: entry.nextRetryAt
                });
            }
        });

        run(rows);
    }

    /**
     * Loads due backlog rows ordered by `at`.
     *
     * @param stream WAL stream id.
     * @param nowIso Current ISO timestamp.
     * @param limit Maximum rows.
     * @returns Due entries.
     */
    findDue(stream: LogWalStream, nowIso: string, limit: number): LogWalEntryRow[] {
        return this.db.prepare(`
            SELECT id, stream, kind, at, nodeId, payload, attempts, maxAttempts, nextRetryAt
            FROM wal_entries
            WHERE stream = ? AND nextRetryAt IS NOT NULL AND nextRetryAt <= ?
            ORDER BY at ASC
            LIMIT ?
        `).all(stream, nowIso, limit) as LogWalEntryRow[];
    }

    /**
     * Deletes rows by primary key.
     *
     * @param ids Row ids.
     * @returns Nothing.
     */
    deleteByIds(ids: string[]): void {
        if (ids.length === 0) {
            return;
        }

        const placeholders = ids.map(() => "?").join(", ");

        this.db.prepare(`DELETE FROM wal_entries WHERE id IN (${placeholders})`).run(...ids);
    }

    /**
     * Deletes a single row.
     *
     * @param id Row id.
     * @returns Nothing.
     */
    deleteById(id: string): void {
        this.db.prepare("DELETE FROM wal_entries WHERE id = ?").run(id);
    }

    /**
     * Updates retry metadata after a failed export.
     *
     * @param id Row id.
     * @param attempts New attempt count.
     * @param nextRetryAt Next retry ISO timestamp.
     * @returns Nothing.
     */
    updateRetry(id: string, attempts: number, nextRetryAt: string): void {
        this.db.prepare(
            "UPDATE wal_entries SET attempts = ?, nextRetryAt = ? WHERE id = ?"
        ).run(attempts, nextRetryAt, id);
    }
}
