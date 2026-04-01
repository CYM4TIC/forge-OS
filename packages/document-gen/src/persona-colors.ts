/**
 * Persona color registry — single source of truth for document generation.
 * Matches the PERSONA_VISUALS registry in @forge-os/canvas-components.
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
