(() => {
  if (window.__KKOTIUM_COLLECTOR_V030__) return;
  window.__KKOTIUM_COLLECTOR_V030__ = true;

  const clean = (value) => String(value || '').trim();
  const absolute = (value) => {
    const v = clean(value);
    if (!v) return '';
    try { return new URL(v, location.href).href; } catch { return ''; }
  };

  function add(list, seen, item) {
    if (!item?.url) return;
    const url = absolute(item.url);
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    list.push({
      id: `${item.kind}-${list.length}-${Math.random().toString(36).slice(2, 8)}`,
      kind: item.kind,
      url,
      name: clean(item.name) || `${item.kind}-${list.length + 1}`,
      width: Number(item.width) || 0,
      height: Number(item.height) || 0,
      source: item.source || 'DOM'
    });
  }

  function srcsetUrls(value) {
    return clean(value).split(',').map((part) => clean(part.trim().split(/\s+/)[0])).filter(Boolean);
  }

  function collect() {
    const images = [];
    const videos = [];
    const imageSeen = new Set();
    const videoSeen = new Set();

    document.querySelectorAll('img').forEach((el) => {
      add(images, imageSeen, { kind: 'image', url: el.currentSrc || el.src, name: el.alt || el.getAttribute('aria-label'), width: el.naturalWidth, height: el.naturalHeight, source: 'IMG' });
      ['src', 'data-src', 'data-original', 'data-lazy-src'].forEach((attr) => add(images, imageSeen, { kind: 'image', url: el.getAttribute(attr), name: el.alt, source: `IMG:${attr}` }));
      ['srcset', 'data-srcset'].forEach((attr) => srcsetUrls(el.getAttribute(attr)).forEach((url) => add(images, imageSeen, { kind: 'image', url, name: el.alt, source: `IMG:${attr}` })));
    });

    document.querySelectorAll('picture source, source').forEach((el) => {
      srcsetUrls(el.getAttribute('srcset') || el.getAttribute('data-srcset')).forEach((url) => {
        const parent = el.closest('picture');
        add(images, imageSeen, { kind: 'image', url, name: parent?.querySelector('img')?.alt, source: 'PICTURE' });
      });
      const src = el.getAttribute('src');
      if (src && el.type?.startsWith('image/')) add(images, imageSeen, { kind: 'image', url: src, source: 'SOURCE' });
      if (src && el.type?.startsWith('video/')) add(videos, videoSeen, { kind: 'video', url: src, source: 'SOURCE' });
    });

    document.querySelectorAll('video').forEach((el) => {
      add(videos, videoSeen, { kind: 'video', url: el.currentSrc || el.src, name: el.getAttribute('title'), width: el.videoWidth, height: el.videoHeight, source: 'VIDEO' });
      add(images, imageSeen, { kind: 'image', url: el.poster, name: 'video poster', source: 'VIDEO:POSTER' });
      el.querySelectorAll('source').forEach((source) => add(videos, videoSeen, { kind: 'video', url: source.src || source.getAttribute('src'), name: el.getAttribute('title'), source: 'VIDEO:SOURCE' }));
    });

    document.querySelectorAll('*').forEach((el) => {
      const style = getComputedStyle(el);
      const bg = style.backgroundImage || '';
      const matches = bg.matchAll(/url\((['"]?)(.*?)\1\)/g);
      for (const match of matches) add(images, imageSeen, { kind: 'image', url: match[2], source: 'CSS:BACKGROUND' });
    });

    try {
      performance.getEntriesByType('resource').forEach((entry) => {
        const name = entry.name || '';
        if (/\.(?:jpg|jpeg|png|gif|webp|avif|svg)(?:$|[?#])/i.test(name)) add(images, imageSeen, { kind: 'image', url: name, source: 'NETWORK' });
        if (/\.(?:mp4|webm|mov|m4v|mkv|m3u8|mpd)(?:$|[?#])/i.test(name)) add(videos, videoSeen, { kind: 'video', url: name, source: 'NETWORK' });
      });
    } catch {}

    return {
      page: {
        title: document.title,
        url: location.href,
        hostname: location.hostname
      },
      images,
      videos,
      collectedAt: new Date().toISOString()
    };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'KKOTIUM_COLLECT') {
      sendResponse({ ok: true, data: collect() });
    }
    return true;
  });
})();
