/**
 * Renders a template string by replacing variable tokens with theme values.
 *
 * Template syntax: {{variableName}}
 * Variable names: alphanumeric + hyphens (e.g., group-name, fleetID)
 *
 * @param template - String containing {{variable}} tokens
 * @param theme - Key-value pairs for replacement
 * @returns Rendered string with variables replaced
 *
 * @example
 * ```typescript
 * const theme = { groupName: "fleet", groupMemberName: "fleet member" };
 * const template = "there are 22 {{groupName}}(s) looking for {{groupMemberName}}(s)";
 * renderTemplate(template, theme);
 * // Returns: "there are 22 fleet(s) looking for fleet member(s)"
 * ```
 */
export function renderTemplate(template: string, theme: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9-]+)\}\}/g, (_, variableName) => {
    return theme[variableName] ?? '';
  });
}
