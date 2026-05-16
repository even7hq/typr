/**
 * Minimal select-row shape accepted by {@link mapSelectOptions}.
 */
export type SelectOptionLike = {
    value: unknown;
    label?: unknown;
    hint?: unknown;
    disabled?: unknown;
};

/**
 * Maps shared option shapes into @clack/prompts option arrays.
 */
export namespace ClackPromptMapper {
    /**
     * Maps select style options into clack option objects.
     *
     * @param options - Option list with string values.
     * @returns Clack compatible option list.
     */
    export function mapSelectOptions(
        options: ReadonlyArray<SelectOptionLike>
    ) {
        return options.map((option: SelectOptionLike) => ({
            value: String(option.value),
            label: String(option.label ?? option.value),
            hint: option.hint === undefined || option.hint === null ? "" : String(option.hint),
            ...(option.disabled === undefined ? {} : { disabled: Boolean(option.disabled) })
        }));
    }
}
