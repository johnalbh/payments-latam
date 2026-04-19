export const ENVIRONMENTS = ['sandbox', 'production'] as const;

export type Environment = (typeof ENVIRONMENTS)[number];

export function isEnvironment(value: string): value is Environment {
  return (ENVIRONMENTS as readonly string[]).includes(value);
}
