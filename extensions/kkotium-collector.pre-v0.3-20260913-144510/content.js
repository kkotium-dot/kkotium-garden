(() => {
  if (window.__KKOTIUM_COLLECTOR__) return;
  window.__KKOTIUM_COLLECTOR__ = true;

  const abs = (value) => {
    if (!value) return null;
    try { return new URL(value, location.href).href; } catch { return null; }
  };

  const addSrcset = (value, out, element) => {
    if (!value) return;
    value.split(',').forEach(part => {
      const url = part.trim().split(/\s+/)[0];
      const u = abs(url);
      if (u) out.push({url:u, kind:'image', source:element});
    });
  };

  const collect = () => {
    const out = [];
    const push = (url, kind, source, meta={}) => {
      const u = abs(url);
      if (!u) return;
      if (u.startsWith('data:')) return;
      out.push({
        url:u, kind, source,
        title: document.title || '',
        pageUrl: location.href,
        ...meta
      });
    };

    document.querySelectorAll('img').forEach((el,i) => {
      push(el.currentSrc || el.src, 'image', 'img', {
        alt: el.alt || '',
        index:i,
        width: el.naturalWidth || el.width || null,
        height: el.naturalHeight || el.height || null
      });
      ['srcset','data-srcset'].forEach(a => addSrcset(el.getAttribute(a), out, 'img-srcset'));
      ['data-src','data-original','data-lazy-src','data-url'].forEach(a => {
        const v=el.getAttribute(a); if(v) push(v,'image','img-'+a);
      });
    });

    document.querySelectorAll('picture source').forEach(el => {
      addSrcset(el.getAttribute('srcset'), out, 'picture-source');
      addSrcset(el.getAttribute('data-srcset'), out, 'picture-source-data');
    });

    document.querySelectorAll('video').forEach((el,i) => {
      push(el.currentSrc || el.src, 'video', 'video', {index:i});
      push(el.poster, 'image', 'video-poster', {index:i});
      el.querySelectorAll('source').forEach(s => push(s.src, 'video', 'video-source', {index:i, type:s.type||''}));
    });

    document.querySelectorAll('source').forEach(el => {
      const type=(el.type||'').toLowerCase();
      const src=el.getAttribute('src');
      if (src && (type.startsWith('video/') || /\.(mp4|webm|mov|m4v|m3u8)(?:[?#]|$)/i.test(src))) {
        push(src,'video','source',{type});
      }
    });

    document.querySelectorAll('*').forEach(el => {
      const style=getComputedStyle(el);
      const bg=style.backgroundImage;
      if (!bg || bg==='none') return;
      const re=/url\((['"]?)(.*?)\1\)/g;
      let m;
      while((m=re.exec(bg))) push(m[2],'image','css-background');
    });

    const seen=new Set();
    return out.filter(x => {
      const key=x.kind+'|'+x.url;
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).map((x,i)=>({...x,id:`m${i+1}`}));
  };

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'KKOTIUM_COLLECT') {
      try { sendResponse({ok:true, items:collect()}); }
      catch (e) { sendResponse({ok:false,error:String(e)}); }
      return true;
    }
  });
})();