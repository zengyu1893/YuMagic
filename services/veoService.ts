/** Legacy Veo settings compatibility used by existing settings panels. */
export interface VeoConfig {
  apiKey: string;
  baseUrl: string;
}

export function getVeoConfig(): VeoConfig {
  const saved = localStorage.getItem('veoConfig');
  if (saved) return JSON.parse(saved) as VeoConfig;
  return {
    apiKey: '',
    baseUrl: 'https://yuli.host',
  };
}

export function saveVeoConfig(config: VeoConfig): void {
  localStorage.setItem('veoConfig', JSON.stringify(config));
}
