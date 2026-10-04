const $ = (selector) => document.querySelector(selector);
const hostInput = $('#host');
const portInput = $('#port');
const toggleButton = $('#toggle');
const message = $('#message');
let enabled = false;

function showMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

function render(state) {
  const settings = state.settings || {};
  hostInput.value = settings.host || '127.0.0.1';
  portInput.value = settings.port || 7890;
  enabled = !!settings.enabled;

  $('#statusDot').classList.toggle('on', enabled);
  $('#routeState').textContent = enabled ? '已启用' : '未启用';
  toggleButton.disabled = false;
  toggleButton.classList.toggle('enabled', enabled);
  toggleButton.textContent = enabled ? '关闭 GitHub 加速' : '启用 GitHub 加速';

  if (state.levelOfControl === 'controlled_by_other_extensions') {
    showMessage('代理设置正由其它扩展控制。', true);
  }
}

async function send(type, payload = {}) {
  const result = await chrome.runtime.sendMessage({ type, ...payload });
  if (!result || !result.ok) throw new Error((result && result.error) || '操作失败');
  return result;
}

async function load() {
  try {
    render(await send('GET_STATE'));
  } catch (error) {
    toggleButton.disabled = true;
    toggleButton.textContent = '无法读取代理状态';
    showMessage(error.message, true);
  }
}

async function saveSettings() {
  const settings = { host: hostInput.value, port: portInput.value };
  try {
    render(await send('SAVE_SETTINGS', { settings }));
    showMessage(enabled ? '设置已保存并应用。' : '设置已保存。');
  } catch (error) {
    showMessage(error.message, true);
  }
}

async function toggleProxy() {
  toggleButton.disabled = true;
  showMessage('');
  try {
    if (!enabled) {
      const saved = await send('SAVE_SETTINGS', {
        settings: { host: hostInput.value, port: portInput.value },
      });
      render(saved);
    }
    render(await send('SET_ENABLED', { enabled: !enabled }));
    showMessage(enabled ? 'GitHub 流量已转发到本机代理。' : 'GitHub 加速已关闭。');
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    toggleButton.disabled = false;
  }
}

$('#save').addEventListener('click', saveSettings);
toggleButton.addEventListener('click', toggleProxy);
load();