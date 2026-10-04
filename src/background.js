const DEFAULTS = {
  host: '127.0.0.1',
  port: 7890,
  enabled: false,
};

const GITHUB_DOMAINS = [
  'github.com',
  'githubusercontent.com',
  'githubassets.com',
  'githubobjects.com',
  'github.io',
];

function validateSettings(value) {
  const host = String(value.host || '').trim();
  const port = Number(value.port);
  const validHost = host.length <= 253
    && host.split('.').every((label) => /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label));

  if (!validHost) throw new Error('代理地址格式不正确');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('端口必须是 1 到 65535 之间的整数');
  }

  return { host, port };
}

function createPacScript(host, port) {
  const checks = GITHUB_DOMAINS.map((domain) =>
    `host === '${domain}' || dnsDomainIs(host, '.${domain}')`
  ).join(' || ');

  return `function FindProxyForURL(url, host) {
  if (${checks}) return 'PROXY ${host}:${port}';
  return 'DIRECT';
}`;
}

function proxyCall(method, details) {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings[method](details, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function proxyGet() {
  return new Promise((resolve, reject) => {
    chrome.proxy.settings.get({ incognito: false }, (details) => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(details);
    });
  });
}

async function readSettings() {
  const stored = await chrome.storage.local.get(DEFAULTS);
  return { ...DEFAULTS, ...stored };
}

async function applyProxy(settings) {
  const { host, port } = validateSettings(settings);
  await proxyCall('set', {
    value: {
      mode: 'pac_script',
      pacScript: { data: createPacScript(host, port) },
    },
    scope: 'regular',
  });
}

async function getState() {
  const [settings, proxy] = await Promise.all([readSettings(), proxyGet()]);
  return {
    settings,
    levelOfControl: proxy.levelOfControl,
    proxyMode: proxy.value && proxy.value.mode,
  };
}

async function handleMessage(message) {
  if (message.type === 'GET_STATE') return getState();

  if (message.type === 'SAVE_SETTINGS') {
    const settings = validateSettings(message.settings || {});
    const current = await readSettings();
    if (current.enabled) await applyProxy(settings);
    await chrome.storage.local.set(settings);
    return getState();
  }

  if (message.type === 'SET_ENABLED') {
    const current = await readSettings();
    if (message.enabled) {
      await applyProxy(current);
      await chrome.storage.local.set({ enabled: true });
    } else {
      await proxyCall('clear', { scope: 'regular' });
      await chrome.storage.local.set({ enabled: false });
    }
    return getState();
  }

  throw new Error('未知操作');
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((state) => sendResponse({ ok: true, ...state }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function restoreProxy() {
  const settings = await readSettings();
  if (settings.enabled) await applyProxy(settings);
}

chrome.runtime.onInstalled.addListener(() => restoreProxy().catch(console.error));
chrome.runtime.onStartup.addListener(() => restoreProxy().catch(console.error));