import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const configPath = require.resolve('./config.js');

function loadConfigWithEnv(env) {
  const previousEnv = {};
  for (const key of Object.keys(env)) {
    previousEnv[key] = process.env[key];
    if (env[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = env[key];
    }
  }

  delete require.cache[configPath];
  const config = require('./config.js');

  for (const key of Object.keys(env)) {
    if (previousEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = previousEnv[key];
    }
  }
  delete require.cache[configPath];

  return config;
}

test('uses install directory for packaged Electron writable data', () => {
  const installDir = 'D:\\Apps\\YuMagic';
  const config = loadConfigWithEnv({
    IS_ELECTRON: 'true',
    INSTALL_DATA_PATH: installDir,
    USER_DATA_PATH: 'D:\\Users\\AppData\\YuMagic',
  });

  assert.equal(config.BASE_DIR, installDir);
  assert.equal(config.OUTPUT_DIR, `${installDir}\\output`);
});

test('uses project directory when not running as packaged Electron', () => {
  const config = loadConfigWithEnv({
    IS_ELECTRON: undefined,
    INSTALL_DATA_PATH: undefined,
    USER_DATA_PATH: 'D:\\Users\\AppData\\YuMagic',
  });

  assert.match(config.BASE_DIR, /Penguin-Magic-main$/);
});
