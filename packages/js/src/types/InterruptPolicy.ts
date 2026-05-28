/**
 * What happens after Ctrl+C and an optional {@link FramedConsoleOptions.onInterrupt} handler completes.
 */
export type InterruptPolicy =
    /** Close the panel and return control to the caller (libraries, nested menus, wizards). */
    | "handoff"
    /** Close the panel and exit the process with code 130 (standalone CLI owned by this tool). */
    | "exit";
