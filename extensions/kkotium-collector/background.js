const downloadMeta = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

function safeName(value) {
  return String(value || 'media')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'media';
}

function extensionFromUrl(url, kind) {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]{2,6})$/i);
    if (match) return `.${match[1].toLowerCase()}`;
  } catch {}
  return kind === 'video' ? '.mp4' : '.jpg';
}

function classifyUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === 'blob:') return { ok: false, reason: 'blob URL은 브라우저 내부 객체라 직접 파일 저장할 수 없습니다.' };
    if (u.protocol === 'data:') return { ok: false, reason: 'data URL은 일반 다운로드 대상으로 처리하지 않습니다.' };
    if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: `지원하지 않는 URL 형식입니다: ${u.protocol}` };
    if (/\.m3u8(?:$|[?#])/i.test(u.pathname + u.search)) return { ok: false, reason: 'HLS(M3U8) 스트림입니다. 단일 동영상 파일이 아닙니다.' };
    if (/\.mpd(?:$|[?#])/i.test(u.pathname + u.search)) return { ok: false, reason: 'DASH(MPD) 스트림입니다. 단일 동영상 파일이 아닙니다.' };
    return { ok: true };
  } catch {
    return { ok: false, reason: '올바른 URL이 아닙니다.' };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'KKOTIUM_DOWNLOAD') return;

  const item = message.item || {};
  const url = item.url;
  const checked = classifyUrl(url);
  if (!checked.ok) {
    sendResponse({ ok: false, error: checked.reason, code: 'UNSUPPORTED_URL' });
    return;
  }

  const kind = item.kind === 'video' ? 'video' : 'image';
  const base = safeName(item.name || `${kind}-${Date.now()}`);
  const ext = extensionFromUrl(url, kind);
  const filename = `kkotium-collector/${base}${ext}`;

  chrome.downloads.download({
    url,
    filename,
    saveAs: false,
    conflictAction: 'uniquify'
  }).then((downloadId) => {
    downloadMeta.set(downloadId, { itemId: item.id, url });
    sendResponse({ ok: true, downloadId });
  }).catch((error) => {
    sendResponse({ ok: false, error: error?.message || String(error), code: 'DOWNLOAD_START_FAILED' });
  });

  return true;
});

chrome.downloads.onChanged.addListener((delta) => {
  const meta = downloadMeta.get(delta.id);
  if (!meta) return;

  if (delta.state?.current === 'complete') {
    chrome.runtime.sendMessage({
      type: 'KKOTIUM_DOWNLOAD_STATUS',
      itemId: meta.itemId,
      downloadId: delta.id,
      state: 'complete'
    }).catch(() => {});
    downloadMeta.delete(delta.id);
    return;
  }

  if (delta.state?.current === 'interrupted') {
    chrome.downloads.search({ id: delta.id }).then((items) => {
      const error = items?.[0]?.error || '다운로드가 중단되었습니다.';
      chrome.runtime.sendMessage({
        type: 'KKOTIUM_DOWNLOAD_STATUS',
        itemId: meta.itemId,
        downloadId: delta.id,
        state: 'interrupted',
        error
      }).catch(() => {});
    }).catch(() => {});
    downloadMeta.delete(delta.id);
  }
});
