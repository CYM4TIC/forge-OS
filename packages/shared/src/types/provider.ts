export type ProviderType = 'claude' | 'openai';

export interface ModelMapping {
  high: string;
  medium: string;
  fast: string;
}

export interface ProviderConfig {
  api_key: string;
  base_url: string | null;
  model_mappings: ModelMapping;
  is_default: boolean;
}

export interface Provider {
  id: string;
  name: string;
  type: ProviderType;
  config: ProviderConfig;
  is_enabled: boolean;
}
