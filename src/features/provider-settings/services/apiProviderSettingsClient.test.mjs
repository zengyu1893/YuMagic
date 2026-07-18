import assert from 'node:assert/strict';
import test from 'node:test';

const {
  createApiProviderProfile,
  createApiProviderProfileModelSettings,
  mergeApiProviderSettingsIntoAppSettings,
  migrateLegacyThirdPartyConfig,
  removeApiProviderProfile,
  resolveFetchedProviderSelectedModelIds,
  resolveGenerationApiProviderProfile,
  toThirdPartyApiConfig,
  updateApiProviderProfileModelSettings,
  upsertApiProviderProfile,
} = await import('./apiProviderSettingsClient.ts');

test('migrates legacy third party config into a yuli provider profile', () => {
  const migrated = migrateLegacyThirdPartyConfig({
    enabled: true,
    baseUrl: 'https://yuli.host',
    apiKey: 'sk-legacy',
    model: 'old-image-model',
    chatModel: 'old-chat-model',
  });

  assert.equal(migrated.version, 1);
  assert.equal(migrated.profiles.length, 1);
  assert.equal(migrated.activeProfileId, migrated.profiles[0].id);
  assert.equal(migrated.profiles[0].templateId, 'yuli');
  assert.equal(migrated.profiles[0].name, '玉玉 API');
  assert.equal(migrated.profiles[0].baseUrl, 'https://yuli.host');
  assert.equal(migrated.profiles[0].apiKey, 'sk-legacy');
  assert.equal(migrated.profiles[0].enabled, true);
});

test('removes active profile and clears active profile id', () => {
  const first = createApiProviderProfile('yuli', { id: 'profile-a', apiKey: 'sk-a' });
  const second = createApiProviderProfile('openai-compatible', { id: 'profile-b', apiKey: 'sk-b' });
  const settings = {
    version: 1,
    activeProfileId: 'profile-a',
    profiles: [first, second],
  };

  const updated = removeApiProviderProfile(settings, 'profile-a');

  assert.equal(updated.activeProfileId, null);
  assert.deepEqual(updated.profiles.map(profile => profile.id), ['profile-b']);
});

test('adds a provider profile without making it active when generation selection is runtime-only', () => {
  const profile = createApiProviderProfile('yuli', { id: 'profile-a', apiKey: 'sk-a' });
  const settings = {
    version: 1,
    activeProfileId: null,
    profiles: [],
  };

  const updated = upsertApiProviderProfile(settings, profile, false);

  assert.equal(updated.activeProfileId, null);
  assert.deepEqual(updated.profiles.map(item => item.id), ['profile-a']);
});

test('removes the last profile and clears active profile id', () => {
  const only = createApiProviderProfile('custom-compatible', { id: 'profile-a' });
  const settings = {
    version: 1,
    activeProfileId: 'profile-a',
    profiles: [only],
  };

  const updated = removeApiProviderProfile(settings, 'profile-a');

  assert.equal(updated.activeProfileId, null);
  assert.deepEqual(updated.profiles, []);
});

test('derives current third party config from the active profile and global models', () => {
  const profile = createApiProviderProfile('openai-compatible', {
    id: 'openai-main',
    name: 'OpenAI Main',
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-openai',
  });

  const config = toThirdPartyApiConfig(profile, {
    activeImageModel: 'gpt-image-2',
    activeChatModel: 'gpt-4.1',
    activeVideoModel: 'sora-2',
  });

  assert.deepEqual(config, {
    enabled: true,
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-openai',
    model: 'gpt-image-2',
    chatModel: 'gpt-4.1',
    videoModel: 'sora-2',
  });
});

test('merges api provider settings without dropping other app settings fields', () => {
  const apiProviderSettings = {
    version: 1,
    activeProfileId: 'profile-a',
    profiles: [createApiProviderProfile('yuli', { id: 'profile-a' })],
  };

  const merged = mergeApiProviderSettingsIntoAppSettings(
    { theme: 'light', storyTheme: 'magic' },
    apiProviderSettings,
  );

  assert.deepEqual(merged, {
    theme: 'light',
    storyTheme: 'magic',
    apiProviderSettings,
  });
});

test('resolves the generation provider from runtime selection without changing active profile id', () => {
  const first = createApiProviderProfile('yuli', { id: 'profile-a', apiKey: 'sk-a' });
  const second = createApiProviderProfile('openai-compatible', { id: 'profile-b', apiKey: 'sk-b' });
  const settings = {
    version: 1,
    activeProfileId: null,
    profiles: [first, second],
  };

  const selected = resolveGenerationApiProviderProfile(settings, 'profile-b');

  assert.equal(selected?.id, 'profile-b');
  assert.equal(settings.activeProfileId, null);
});

test('falls back to the first enabled keyed provider for generation', () => {
  const empty = createApiProviderProfile('custom-compatible', { id: 'profile-empty', apiKey: '' });
  const disabled = createApiProviderProfile('yuli', { id: 'profile-disabled', apiKey: 'sk-disabled', enabled: false });
  const usable = createApiProviderProfile('openai-compatible', { id: 'profile-usable', apiKey: 'sk-usable' });
  const settings = {
    version: 1,
    activeProfileId: null,
    profiles: [empty, disabled, usable],
  };

  const selected = resolveGenerationApiProviderProfile(settings, 'missing-profile');

  assert.equal(selected?.id, 'profile-usable');
});

test('stores selected models on the provider profile instead of global settings', () => {
  const yuli = createApiProviderProfile('yuli', { id: 'profile-yuli', apiKey: 'sk-yuli' });
  const openai = createApiProviderProfile('openai-compatible', { id: 'profile-openai', apiKey: 'sk-openai' });
  const settings = {
    version: 1,
    activeProfileId: null,
    profiles: [yuli, openai],
  };

  const modelSettings = createApiProviderProfileModelSettings({
    allModels: [{ id: 'gpt-image-2' }, { id: 'gpt-4.1' }],
    categories: { 'gpt-image-2': 'image', 'gpt-4.1': 'chat' },
    selectedIds: ['gpt-image-2', 'gpt-4.1'],
  });
  const updated = updateApiProviderProfileModelSettings(settings, 'profile-openai', modelSettings);

  assert.equal(updated.profiles.find(profile => profile.id === 'profile-yuli')?.modelSettings, undefined);
  assert.deepEqual(updated.profiles.find(profile => profile.id === 'profile-openai')?.modelSettings?.imageModels, ['gpt-image-2']);
  assert.deepEqual(updated.profiles.find(profile => profile.id === 'profile-openai')?.modelSettings?.chatModels, ['gpt-4.1']);
});

test('derives third party config from provider-scoped active models first', () => {
  const profile = createApiProviderProfile('openai-compatible', {
    id: 'openai-main',
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-openai',
    modelSettings: createApiProviderProfileModelSettings({
      allModels: [{ id: 'provider-image' }, { id: 'provider-chat' }, { id: 'provider-video' }],
      categories: {
        'provider-image': 'image',
        'provider-chat': 'chat',
        'provider-video': 'video',
      },
      selectedIds: ['provider-image', 'provider-chat', 'provider-video'],
    }),
  });

  const config = toThirdPartyApiConfig(profile, {
    activeImageModel: 'global-image',
    activeChatModel: 'global-chat',
    activeVideoModel: 'global-video',
  });

  assert.equal(config.model, 'provider-image');
  assert.equal(config.chatModel, 'provider-chat');
  assert.equal(config.videoModel, 'provider-video');
});

test('keeps provider fetched models unselected when the provider has no previous selection', () => {
  const selectedIds = resolveFetchedProviderSelectedModelIds(
    [{ id: 'image-a' }, { id: 'chat-a' }],
    null,
  );

  assert.deepEqual(selectedIds, []);
});

test('keeps only previous provider selections that still exist after fetching models', () => {
  const previous = createApiProviderProfileModelSettings({
    allModels: [{ id: 'image-a' }, { id: 'chat-a' }, { id: 'old-video' }],
    categories: { 'image-a': 'image', 'chat-a': 'chat', 'old-video': 'video' },
    selectedIds: ['image-a', 'chat-a', 'old-video'],
  });

  const selectedIds = resolveFetchedProviderSelectedModelIds(
    [{ id: 'image-a' }, { id: 'chat-a' }, { id: 'new-video' }],
    previous,
  );

  assert.deepEqual(selectedIds, ['image-a', 'chat-a']);
});
