/**
 * Persona registry — single source of truth for the 10 Forge OS personas.
 * Used by @forge-os/canvas-components (glyphs) and @forge-os/document-gen (colors/names).
 */

export type PersonaSlug =
  | 'nyx' | 'pierce' | 'mara' | 'riven' | 'kehinde'
  | 'tanaka' | 'vane' | 'voss' | 'calloway' | 'sable';

export const PERSONA_COLORS: Record<PersonaSlug, string> = {
  nyx: '#6366F1',
  pierce: '#EF4444',
  mara: '#EC4899',
  riven: '#8B5CF6',
  kehinde: '#3B82F6',
  tanaka: '#F59E0B',
  vane: '#10B981',
  voss: '#6B7280',
  calloway: '#F97316',
  sable: '#14B8A6',
};

export const PERSONA_NAMES: Record<PersonaSlug, string> = {
  nyx: 'Dr. Nyx',
  pierce: 'Dr. Pierce',
  mara: 'Dr. Mara',
  riven: 'Dr. Riven',
  kehinde: 'Dr. Kehinde',
  tanaka: 'Dr. Tanaka',
  vane: 'Dr. Vane',
  voss: 'Dr. Voss',
  calloway: 'Dr. Calloway',
  sable: 'Dr. Sable',
};

/** Short name without "Dr." — for compact UI contexts (badges, metadata rows) */
export const PERSONA_SHORT: Record<PersonaSlug, string> = {
  nyx: 'Nyx',
  pierce: 'Pierce',
  mara: 'Mara',
  riven: 'Riven',
  kehinde: 'Kehinde',
  tanaka: 'Tanaka',
  vane: 'Vane',
  voss: 'Voss',
  calloway: 'Calloway',
  sable: 'Sable',
};

/** Domain tag — the role each persona fills */
export const PERSONA_DOMAINS: Record<PersonaSlug, string> = {
  nyx: 'Build',
  pierce: 'QA',
  mara: 'UX',
  riven: 'Design',
  kehinde: 'Systems',
  tanaka: 'Security',
  vane: 'Finance',
  voss: 'Legal',
  calloway: 'Growth',
  sable: 'Brand',
};

/** Compact label for dropdowns/filters: "Mara (UX)" */
export const PERSONA_LABELS: Record<PersonaSlug, string> = Object.fromEntries(
  (Object.keys(PERSONA_SHORT) as PersonaSlug[]).map((slug) => [
    slug,
    `${PERSONA_SHORT[slug]} (${PERSONA_DOMAINS[slug]})`,
  ])
) as Record<PersonaSlug, string>;

export const PERSONA_GLYPHS: Record<PersonaSlug, string> = {
  nyx: 'Lightning Bolt',
  pierce: 'Crosshair',
  mara: 'Eye',
  riven: 'Grid',
  kehinde: 'Nested Brackets',
  tanaka: 'Hex Shield',
  vane: 'Ledger Mark',
  voss: 'Pilcrow',
  calloway: 'Breaking Wave',
  sable: 'Cursor',
};
