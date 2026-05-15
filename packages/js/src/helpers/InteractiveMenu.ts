import { isCancel } from "@clack/prompts";

import { TUICanceledError } from "../errors/TUICanceledError";
import { AbstractAdapter } from "../models/AbstractAdapter";

/**
 * The canonical binary name shown in hints and the intro header.
 */
const DEFAULT_BIN_NAME = "luckymaker";

/**
 * A leaf action the user can pick. When selected, the resolved command string is returned.
 */
interface MenuAction {
    type: "action";
    value: string;
    label: string;
    hint?: string;
}

/**
 * A branch that opens a nested sub-menu when selected.
 */
interface MenuGroup {
    type: "group";
    value: string;
    label: string;
    hint?: string;
    children: MenuItem[];
}

type MenuItem = MenuAction | MenuGroup;

/**
 * Full command tree shown when the user does not supply a command or supplies a partial path.
 */
const MENU: MenuItem[] = [
    {
        type: "group",
        value: "db",
        label: "db - Banco de dados",
        hint: "migrations, seed, sync, mysql",
        children: [
            {
                type: "group",
                value: "db migration",
                label: "migration - Gerenciar migrations",
                hint: "criar, executar, reverter",
                children: [
                    { type: "action", value: "db migration create", label: "create  - Gerar migration do diff de schema" },
                    { type: "action", value: "db migration run", label: "run     - Executar uma migration específica" },
                    { type: "action", value: "db migration run-all", label: "run-all - Executar todas as pendentes" },
                    { type: "action", value: "db migration rollback", label: "rollback    - Reverter uma migration" },
                    { type: "action", value: "db migration rollback-to", label: "rollback-to - Reverter até uma migration" }
                ]
            },
            {
                type: "group",
                value: "db seed",
                label: "seed - Gerenciar seeders",
                hint: "criar e executar seeders",
                children: [
                    { type: "action", value: "db seed create", label: "create  - Criar novo seeder" },
                    { type: "action", value: "db seed run", label: "run     - Executar um seeder" },
                    { type: "action", value: "db seed run-all", label: "run-all - Executar todos os seeders" }
                ]
            },
            { type: "action", value: "db sync", label: "sync  - Sincronizar banco sem criar arquivo de migration" },
            { type: "action", value: "db ps", label: "ps    - Conexões abertas (SHOW FULL PROCESSLIST ao vivo)" },
            { type: "action", value: "mysql", label: "mysql - Abrir o console MySQL interativo" }
        ]
    },
    {
        type: "group",
        value: "logs",
        label: "logs           - Visualizar e pesquisar logs",
        hint: "view, list, search, live",
        children: [
            { type: "action", value: "logs view", label: "view   - Abrir um arquivo de log com less" },
            { type: "action", value: "logs list", label: "list   - Listar arquivos disponíveis por prefixo" },
            { type: "action", value: "logs search", label: "search - Pesquisar nos logs com zgrep" },
            { type: "action", value: "logs live", label: "live   - Streaming em tempo real (pm2 logs)" }
        ]
    },
    { type: "action", value: "start", label: "start          - Iniciar o servidor", hint: `${DEFAULT_BIN_NAME} start` },
    { type: "action", value: "docker", label: "docker         - Verificar Docker Desktop", hint: `${DEFAULT_BIN_NAME} docker` },
    { type: "action", value: "plugins:compile", label: "plugins:compile - Compilar plugins", hint: `${DEFAULT_BIN_NAME} plugins:compile` }
];

/**
 * Options for {@link runInteractiveMenu}.
 */
export interface InteractiveMenuOptions {
    /**
     * Name shown in intro and hints.
     */
    binName?: string;

    /**
     * Invoked when the user cancels a prompt instead of the default exit behavior.
     *
     * @returns Nothing.
     */
    onCancel?: () => void;

    /**
     * Invoked when selection does not resolve to a menu item instead of the default exit behavior.
     *
     * @returns Nothing.
     */
    onInvalidSelection?: () => void;
}

/**
 * Finds the sub-tree that matches a given command prefix, or returns the full tree when empty.
 *
 * @param cmdParts - Parts of the command already typed (e.g. ["db", "migration"]).
 * @returns The matching sub-tree or null when the prefix is unknown.
 */
function findSubTree(cmdParts: string[]): MenuItem[] | null {
    if (cmdParts.length === 0) {
        return MENU;
    }

    const prefix = cmdParts.join(" ");

    /**
     * Recursively searches menu groups for a matching prefix.
     *
     * @param items - Current menu level.
     * @returns Matching children, or null when not found.
     */
    function search(items: MenuItem[]): MenuItem[] | null {
        for (const item of items) {
            if (item.value === prefix) {
                return item.type === "group" ? item.children : null;
            }

            if (item.type === "group" && prefix.startsWith(`${item.value} `)) {
                return search(item.children);
            }
        }

        return null;
    }

    return search(MENU);
}

/**
 * Presents a nested select menu using the shared adapter.
 *
 * @param adapter - Prompt adapter for the active runtime mode.
 * @param items - Menu items for the current level.
 * @param breadcrumb - Breadcrumb label for the prompt message.
 * @param options - Optional cancel and invalid handlers.
 * @returns Resolved command string.
 */
async function presentMenu(
    adapter: AbstractAdapter,
    items: MenuItem[],
    breadcrumb: string,
    options?: InteractiveMenuOptions
): Promise<string> {
    const message = breadcrumb ? `${breadcrumb}  >  O que você quer fazer?` : "O que você quer fazer?";
    const chosen = await adapter.select({
        message,
        options: items.map((item) => ({
            value: item.value,
            label: item.label,
            hint: item.hint ?? ""
        }))
    });

    if (isCancel(chosen)) {
        adapter.cancel("Cancelado.");

        if (options?.onCancel) {
            options.onCancel();
        } else {
            process.exit(0);
        }

        throw new TUICanceledError("INTERACTIVE_MENU_CANCELED");
    }

    const selected = items.find((i) => i.value === chosen);

    if (!selected) {
        adapter.cancel("Opção inválida.");

        if (options?.onInvalidSelection) {
            options.onInvalidSelection();
        } else {
            process.exit(1);
        }

        throw new Error("INTERACTIVE_MENU_INVALID_SELECTION");
    }

    if (selected.type === "action") {
        return selected.value;
    }

    const parts = selected.value.split(" ");
    const newBreadcrumb = parts.join(" > ");

    adapter.note(`Você escolheu: ${selected.label.split(" - ")[0].trim()}`, "");

    return await presentMenu(adapter, selected.children, newBreadcrumb, options);
}

/**
 * Launches the interactive menu, optionally scoped to a partial command path.
 *
 * @param adapter - Prompt adapter for the active runtime mode.
 * @param cmdParts - Parts of the command already typed (may be empty).
 * @param options - Optional binary name and exit overrides.
 * @returns Fully qualified command string chosen by the user.
 */
export async function runInteractiveMenu(
    adapter: AbstractAdapter,
    cmdParts: string[],
    options?: InteractiveMenuOptions
): Promise<string> {
    const binName = options?.binName ?? DEFAULT_BIN_NAME;
    const subtree = findSubTree(cmdParts);

    if (!subtree) {
        adapter.intro(binName);
        return await presentMenu(adapter, MENU, "", options);
    }

    adapter.intro(binName);

    const breadcrumb = cmdParts.join(" > ");

    return await presentMenu(adapter, subtree, breadcrumb, options);
}
