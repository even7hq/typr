/**
 * Cached clack module instance - loaded once on first use.
 */
let clackCache: typeof import("@clack/prompts") | null = null;

/**
 * Lazily loads the @clack/prompts ESM module from CommonJS callers.
 *
 * @returns The clack prompts module.
 */
export async function loadClack(): Promise<typeof import("@clack/prompts")> {
    if (!clackCache) {
        clackCache = await import("@clack/prompts");
    }

    return clackCache;
}
