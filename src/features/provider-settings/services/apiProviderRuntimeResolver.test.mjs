import assert from 'node:assert/strict';
import test from 'node:test';

const {
  getSelectableProviderModels,
  resolveCanvasNodeThirdPartyConfig,
} = await import('./apiProviderRuntimeResolver.ts');

const settings = {
  version: 1,
  activeProfileId: null,
  profiles: [
    {
      id: 'yuli',
      templateId: 'yuli',
      name: 'Yuli',
      baseUrl: 'https://yuli.host',
      apiKey: 'sk-yuli',
      enabled: true,
      createdAt: 'now',
      updatedAt: 'now',
      modelSettings: {
        allModels: [{ id: 'yuli-image' }, { id: 'yuli-chat' }, { id: 'yuli-video' }],
        categories: { 'yuli-image': 'image', 'yuli-chat': 'chat', 'yuli-video': 'video' },
        imageModels: ['yuli-image'],
        chatModels: ['yuli-chat'],
        videoModels: ['yuli-video'],
        activeImageModel: 'yuli-image',
        activeChatModel: 'yuli-chat',
        activeVideoModel: 'yuli-video',
        updatedAt: 'now',
      },
    },
    {
      id: 'openai',
      templateId: 'openai-compatible',
      name: 'OpenAI',
      baseUrl: 'https://api.openai.com',
      apiKey: 'sk-openai',
      enabled: true,
      createdAt: 'now',
      updatedAt: 'now',
      modelSettings: {
        allModels: [{ id: 'gpt-image-2' }, { id: 'gpt-4.1' }],
        categories: { 'gpt-image-2': 'image', 'gpt-4.1': 'chat' },
        imageModels: ['gpt-image-2'],
        chatModels: ['gpt-4.1'],
        videoModels: [],
        activeImageModel: 'gpt-image-2',
        activeChatModel: 'gpt-4.1',
        activeVideoModel: '',
        updatedAt: 'now',
      },
    },
  ],
};

test('returns selectable models only from the selected provider', () => {
  const models = getSelectableProviderModels(settings, 'openai', 'image');

  assert.deepEqual(models, ['gpt-image-2']);
});

test('derives image config from the node selected provider and model', () => {
  const config = resolveCanvasNodeThirdPartyConfig(settings, {
    apiProviderProfileId: 'openai',
    imageModel: 'gpt-image-2',
  }, 'image');

  assert.deepEqual(config, {
    enabled: true,
    baseUrl: 'https://api.openai.com',
    apiKey: 'sk-openai',
    model: 'gpt-image-2',
    chatModel: 'gpt-4.1',
    videoModel: undefined,
  });
});

test('falls back to old global config when a node has no selected provider', () => {
  const fallback = {
    enabled: true,
    baseUrl: 'https://legacy.example.com',
    apiKey: 'sk-legacy',
    model: 'legacy-image',
    chatModel: 'legacy-chat',
    videoModel: 'legacy-video',
  };

  const config = resolveCanvasNodeThirdPartyConfig(settings, {}, 'chat', fallback);

  assert.deepEqual(config, fallback);
});

test('does not use stale image settings model outside the selected provider', () => {
  const config = resolveCanvasNodeThirdPartyConfig(settings, {
    apiProviderProfileId: 'yuli',
    settings: { model: 'gpt-image-2' },
  }, 'image');

  assert.equal(config.model, 'yuli-image');
});

test('does not fall back to global config when a saved provider is unavailable', () => {
  const fallback = {
    enabled: true,
    baseUrl: 'https://legacy.example.com',
    apiKey: 'sk-legacy',
    model: 'legacy-image',
    chatModel: 'legacy-chat',
    videoModel: 'legacy-video',
  };

  const config = resolveCanvasNodeThirdPartyConfig(settings, {
    apiProviderProfileId: 'missing-provider',
    chatModel: 'legacy-chat',
  }, 'chat', fallback);

  assert.equal(config, null);
});
