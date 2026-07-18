/** Legacy Sora settings compatibility used by existing settings panels. */
export interface SoraConfig {
  apiKey: string;
  baseUrl: string;
}

export function getSoraConfig(): SoraConfig {
  const saved = localStorage.getItem('soraConfig');
  if (saved) return JSON.parse(saved) as SoraConfig;
  return {
    apiKey: '',
    baseUrl: 'https://yuli.host',
  };
}

export function saveSoraConfig(config: SoraConfig): void {
  localStorage.setItem('soraConfig', JSON.stringify(config));
}
