export type PanelId =
  | 'chat'
  | 'canvas'
  | 'preview'
  | 'connectivity'
  | 'team'
  | 'timeline';

export interface PanelConfig {
  id: PanelId;
  label: string;
  is_visible: boolean;
  size_percent: number;
}

export interface PanelLayout {
  id: string;
  panels: PanelConfig[];
  is_active: boolean;
  created_at: string;
}
