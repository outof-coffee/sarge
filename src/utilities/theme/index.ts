// To prevent circular dependencies, all definitions for the base templates are in this module. Other themes can 
// use TemplateTheme from here without importing, or can import both if key definitions are needed.

// MARK: - Exports
export function renderTemplate(template: string, theme: TemplateTheme = BaseTheme): string {
  const validTheme = filterThemeToStrings(theme);

  return template.replace(/\{\{([a-zA-Z0-9-]+)\}\}/g, (_, varName) => {
    return validTheme[varName] ?? '';
  });
}

export class TemplateTheme {
  [key: string]: string | string[] | ((override: Partial<Record<string, string | string[]>>) => TemplateTheme);

  constructor(values: Record<string, string | string[]> = {}) {
    Object.assign(this, values);
  }

  withOverride(override: Partial<Record<string, string | string[]>>): TemplateTheme {
    return new TemplateTheme({ ...this, ...override });
  }
}

export enum BaseThemeKeys {
  greeting = 'greeting',
  goodbye = 'goodbye',
  dismissal = 'dismissal',
  placeholder = 'placeholder',
  error = 'error',
  success = 'success',
  invalidInput = 'invalid-input',
  unknown = 'unknown',
  guildOnly = 'guild-only',
  notFound = 'not-found',
  sorry = 'sorry',
  acknowledged = 'acknowledged'
}

export const BaseTheme = new TemplateTheme({
  [BaseThemeKeys.greeting]: [
    'Hello',
    'Hi there',
    'Greetings',
    'Hey',
    'Welcome',
    'Howdy',
    'Good day',
    'Salutations'
  ],
  [BaseThemeKeys.goodbye]: [
    'Goodbye',
    'See you later',
    'Take care',
    'Later',
    'Catch you later',
    "That's all",
    'Done',
    'Until next time',
    'Peace out',
    'Cheers'
  ],
  [BaseThemeKeys.dismissal]: [
    'Access denied',
    'Not authorized',
    "You don't have permission",
    'Move along',
    'Nothing to see here'
  ],
  [BaseThemeKeys.placeholder]: ["N/A", "-"],
  [BaseThemeKeys.error]: "Error",
  [BaseThemeKeys.success]: "Success",
  [BaseThemeKeys.invalidInput]: "Invalid input",
  [BaseThemeKeys.unknown]: "Unknown",
  [BaseThemeKeys.guildOnly]: "Guild required",
  [BaseThemeKeys.notFound]: "Not found",
  [BaseThemeKeys.sorry]: "Sorry",
  [BaseThemeKeys.acknowledged]: "Acknowledged"
});

// MARK: - Private

interface NormalizedTheme {
  [key: string]: string;
}

function pickRandomString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    const strings = value.filter((item): item is string => typeof item === 'string');
    if (strings.length === 0) return null;
    return strings[Math.floor(Math.random() * strings.length)];
  }

  if (value != null && typeof value === 'object' && Symbol.iterator in value) {
    const strings: string[] = [];
    for (const item of value as Iterable<unknown>) {
      if (typeof item === 'string') {
        strings.push(item);
      }
    }
    if (strings.length === 0) return null;
    return strings[Math.floor(Math.random() * strings.length)];
  }

  return null;
}

function filterThemeToStrings(theme: TemplateTheme): NormalizedTheme {
  const filtered: NormalizedTheme = {};

  for (const [key, value] of Object.entries(theme)) {
    const selected = pickRandomString(value);
    if (selected !== null) {
      filtered[key] = selected;
    }
  }

  return filtered;
}