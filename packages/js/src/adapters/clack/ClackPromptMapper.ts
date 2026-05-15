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
        options: ReadonlyArray<{
            value: string;
            label?: string;
            hint?: string;
            disabled?: boolean;
        }>
    ) {
        return options.map((option) => ({
            value: option.value,
            label: option.label ?? option.value,
            hint: option.hint ?? "",
            ...(option.disabled === undefined ? {} : { disabled: option.disabled })
        }));
    }
}
