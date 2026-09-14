const state = { data: null, filter: 'all', selected: new Set(), statuses: new Map() };
const $ = (id) => document.getElementById(id);

function toast(message) {
  const el = $('toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
}

function setStatus(text, kind='') {
  const el = $('connection'); el.className = `status ${kind}`; el.innerHTML = `<i></i>${text}`;
}

async function activeTab() {
  const tabs = await chrome.tabs.query({active: true, currentWindow: true});
  return tabs[0];
}

async function collectFromTab() {
  const tab = await activeTab();
  if (!tab?.id) throw new Error('활성 탭을 찾을 수 없습니다.');
  if (/^(chrome|edge|about|devtools|chrome-extension):/i.test(tab.url || '')) {
    throw new Error('Chrome 내부 페이지에서는 미디어 수집을 사용할 수 없습니다.');
  }

  setStatus('수집 중', 'ok');
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {type:'KKOTIUM_COLLECT'});
    if (response?.ok) return response.data;
    throw new Error(response?.error || '수집 응답이 없습니다.');
  } catch (firstError) {
    // 페이지를 새로고침하지 않아도 수집기가 없으면 현재 탭에 즉시 주입하고 재시도한다.
    await chrome.scripting.executeScript({target:{tabId:tab.id}, files:['content.js']});
    await new Promise(r => setTimeout(r, 60));
    const response = await chrome.tabs.sendMessage(tab.id, {type:'KKOTIUM_COLLECT'});
    if (!response?.ok) throw new Error(response?.error || firstError.message);
    return response.data;
  }
}

function allItems() { return [...(state.data?.images || []), ...(state.data?.videos || [])]; }
function filteredItems() { const items = allItems(); return state.filter === 'all' ? items : items.filter(x => x.kind === state.filter); }

function render() {
  const items = filteredItems();
  $('total').textContent = allItems().length;
  $('imageCount').textContent = state.data?.images?.length || 0;
  $('videoCount').textContent = state.data?.videos?.length || 0;
  $('selectedCount').textContent = `${state.selected.size}개`;
  $('download').disabled = state.selected.size === 0;
  $('pageInfo').textContent = state.data ? `${state.data.page.title || '(제목 없음)'} · ${state.data.page.hostname}` : '';
  $('pageInfo').classList.toggle('hidden', !state.data);

  const list = $('list'); list.innerHTML = '';
  $('empty').classList.toggle('hidden', items.length > 0);

  items.forEach((item) => {
    const card = document.createElement('article');
    const selected = state.selected.has(item.id);
    const status = state.statuses.get(item.id);
    card.className = `media-card ${selected ? 'selected' : ''} ${status?.state === 'failed' ? 'failed' : ''}`;

    const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.className='check'; checkbox.checked=selected;
    checkbox.addEventListener('change', () => { checkbox.checked ? state.selected.add(item.id) : state.selected.delete(item.id); render(); });

    const thumb = document.createElement('img'); thumb.className='thumb'; thumb.loading='lazy'; thumb.src = item.kind === 'image' ? item.url : item.url; thumb.onerror = () => { thumb.removeAttribute('src'); thumb.alt='미리보기 없음'; thumb.style.objectFit='contain'; };
    if (item.kind === 'video') thumb.classList.add('video-thumb');

    const meta = document.createElement('div'); meta.className='media-meta';
    const name = document.createElement('div'); name.className='media-name'; name.textContent = item.name || `${item.kind}`;
    const url = document.createElement('div'); url.className='media-url'; url.textContent = item.url;
    const badge = document.createElement('span'); badge.className='badge'; badge.textContent = status?.label || (item.kind === 'video' ? 'VIDEO' : 'IMAGE');
    meta.append(name,url,badge);

    const more = document.createElement('button'); more.className='more'; more.textContent='⋯'; more.title='URL 복사'; more.addEventListener('click', async()=>{ await navigator.clipboard.writeText(item.url); toast('URL을 복사했습니다.'); });
    card.append(checkbox,thumb,meta,more); list.appendChild(card);
  });
}

async function downloadSelected() {
  const items = allItems().filter(x => state.selected.has(x.id));
  if (!items.length) return;
  $('download').disabled = true;
  let started = 0;
  for (const item of items) {
    state.statuses.set(item.id, {state:'waiting', label:'대기'}); render();
    try {
      const response = await chrome.runtime.sendMessage({type:'KKOTIUM_DOWNLOAD', item});
      if (!response?.ok) {
        state.statuses.set(item.id, {state:'failed', label:'저장 불가'});
        toast(`${item.kind === 'video' ? '영상' : '이미지'} 저장 실패: ${response?.error || '알 수 없는 오류'}`);
        continue;
      }
      started++;
      state.statuses.set(item.id, {state:'downloading', label:'저장 중'}); render();
    } catch (e) {
      state.statuses.set(item.id, {state:'failed', label:'저장 실패'}); toast(e.message || '다운로드 실패');
    }
  }
  $('download').disabled = false;
  if (started) toast(`${started}개 다운로드를 시작했습니다.`);
}

$('collect').addEventListener('click', async () => {
  try {
    const data = await collectFromTab();
    state.data = data; state.selected.clear(); state.statuses.clear();
    setStatus('수집 완료', 'ok'); render();
    toast(`${data.images.length + data.videos.length}개 미디어를 찾았습니다.`);
  } catch (e) {
    setStatus('확인 필요', 'error'); toast(e.message || '수집할 수 없습니다.');
  }
});

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.remove('active')); tab.classList.add('active'); state.filter = tab.dataset.filter; render();
}));

$('selectAll').addEventListener('click', () => { filteredItems().forEach(x => state.selected.add(x.id)); render(); });
$('clear').addEventListener('click', () => { state.selected.clear(); render(); });
$('download').addEventListener('click', downloadSelected);

$('copy').addEventListener('click', async () => {
  const urls = allItems().filter(x => state.selected.has(x.id)).map(x => x.url).join('\n');
  if (!urls) return toast('복사할 항목을 먼저 선택하세요.');
  await navigator.clipboard.writeText(urls); toast('선택한 URL을 복사했습니다.');
});

$('json').addEventListener('click', () => {
  if (!state.data) return toast('먼저 페이지를 수집하세요.');
  const payload = JSON.stringify(state.data, null, 2);
  const blob = new Blob([payload], {type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='kkotium-media.json'; a.click(); URL.revokeObjectURL(a.href);
});

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'KKOTIUM_DOWNLOAD_STATUS') return;
  const itemId = message.itemId;
  if (message.state === 'complete') state.statuses.set(itemId, {state:'complete', label:'저장 완료'});
  if (message.state === 'interrupted') state.statuses.set(itemId, {state:'failed', label:'다운로드 중단'});
  render();
});

render();
