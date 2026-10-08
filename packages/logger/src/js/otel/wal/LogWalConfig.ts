import path from "path";

/**
 * Default SQLite filename when {@link LogWalOptions.dbPath} is omitted.
 */
export const DEFAULT_LOG_WAL_DB_FILE = "typr.db";

/**
 * Default maximum OTLP backlog rows in SQLite.
 */
export const DEFAULT_MAX_BACKLOG_ENTRIES = 10_000;

/**
 * Default export retry attempts per backlog row.
 */
export const DEFAULT_MAX_WAL_ATTEMPTS = 10;

/**
 * Default interval between SQLite backlog retry passes.
 */
export const DEFAULT_BACKLOG_FLUSH_INTERVAL_MS = 30_000;

/**
 * User-facing WAL options for OTLP log export.
 */
export interface LogWalOptions {
    /**
     * Absolute or relative SQLite path. Default: `process.cwd()/typr.db`.
     * May point at the same file as LuckyMaker application state (e.g. `state.db`):
     * backlog rows live in shared `wal_entries`, keyed by stream `OTLP_LOGS`.
     */
    dbPath?: string;
    /** Maximum persisted OTLP backlog rows. */
    maxBacklogEntries?: number;
    /** Maximum export attempts per backlog row. */
    maxAttempts?: number;
    /** How often to retry due rows from SQLite. */
    backlogFlushIntervalMs?: number;
}

/**
 * Resolved WAL settings used by {@link OtlpLogWalExportProcessor}.
 */
export interface ResolvedLogWalOptions {
    dbPath: string;
    maxBacklogEntries: number;
    maxAttempts: number;
    backlogFlushIntervalMs: number;
}

/**
 * Resolves the default SQLite path for the log WAL.
 *
 * @param cwd Working directory for relative default.
 * @returns Absolute path to `typr.db` under cwd.
 */
export function resolveDefaultLogWalDbPath(cwd = process.cwd()): string {
    return path.resolve(cwd, DEFAULT_LOG_WAL_DB_FILE);
}

/**
 * Resolves WAL options. Returns null when WAL is explicitly disabled.
 *
 * @param input WAL options or `false` to disable persistence.
 * @returns Resolved options or null.
 */
export function resolveLogWalOptions(input?: LogWalOptions | false): ResolvedLogWalOptions | null {
    if (input === false) {
        return null;
    }

    const rawPath = input?.dbPath?.trim();

    return {
        dbPath: rawPath && rawPath !== "" ? path.resolve(rawPath) : resolveDefaultLogWalDbPath(),
        maxBacklogEntries: resolvePositiveInt(input?.maxBacklogEntries, DEFAULT_MAX_BACKLOG_ENTRIES),
        maxAttempts: resolvePositiveInt(input?.maxAttempts, DEFAULT_MAX_WAL_ATTEMPTS),
        backlogFlushIntervalMs: resolvePositiveInt(
            input?.backlogFlushIntervalMs,
            DEFAULT_BACKLOG_FLUSH_INTERVAL_MS
        )
    };
}

/**
 * Parses a positive integer option.
 *
 * @param raw Configured value.
 * @param defaultValue Fallback when missing or invalid.
 * @returns Positive integer.
 */
function resolvePositiveInt(raw: number | undefined, defaultValue: number): number {
    if (raw === undefined || !Number.isFinite(raw) || raw <= 0) {
        return defaultValue;
    }

    return Math.floor(raw);
}
