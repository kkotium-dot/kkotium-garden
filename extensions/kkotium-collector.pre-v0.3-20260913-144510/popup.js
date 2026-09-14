let items = [];

const $ = id => document.getElementById(id);

const status = text => {
  $("status").textContent = text;
};

const escapeHtml = value =>
  String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

const escapeAttr = escapeHtml;

const selected = () =>
  [...document.querySelectorAll(".pick:checked")]
    .map(x => items.find(i => i.id === x.dataset.id))
    .filter(Boolean);

function filtered() {
  return items.filter(item =>
    (item.kind === "image" && $("images").checked) ||
    (item.kind === "video" && $("videos").checked)
  );
}

function updateSelectionUI() {
  const count = selected().length;
  $("selectedCount").textContent = count;
  $("downloadCount").textContent = count;
  $("download").disabled = count === 0;
}

function render() {
  const list = $("list");
  list.innerHTML = "";

  const shown = filtered();

  const imageCount = items.filter(x => x.kind === "image").length;
  const videoCount = items.filter(x => x.kind === "video").length;

  $("imageCount").textContent = imageCount;
  $("videoCount").textContent = videoCount;
  $("imageCountFilter").textContent = imageCount;
  $("videoCountFilter").textContent = videoCount;

  if (!shown.length) {
    list.innerHTML = `
      <div class="empty">
        <div class="empty-icon">✿</div>
        <strong>수집된 미디어가 없습니다.</strong>
        <span>현재 페이지 수집을 눌러 다시 시도하세요.</span>
      </div>
    `;
    updateSelectionUI();
    return;
  }

  for (const item of shown) {
    const row = document.createElement("div");
    row.className = "item";
    row.dataset.id = item.id;

    const preview =
      item.kind === "image"
        ? `<img class="thumb" src="${escapeAttr(item.url)}" loading="lazy">`
        : `<div class="thumb video-thumb">▶</div>`;

    row.innerHTML = `
      <input
        class="pick"
        type="checkbox"
        data-id="${escapeAttr(item.id)}"
        checked
      >

      ${preview}

      <div class="meta">
        <div class="kind">
          ${item.kind === "video" ? "VIDEO" : "IMAGE"} · ${escapeHtml(item.source)}
        </div>

        <div
          class="url"
          title="${escapeAttr(item.url)}"
        >${escapeHtml(item.url)}</div>

        <div class="download-state"></div>
      </div>
    `;

    list.appendChild(row);
  }

  document.querySelectorAll(".pick").forEach(input => {
    input.addEventListener("change", updateSelectionUI);
  });

  updateSelectionUI();
}

async function activeTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  return tabs[0];
}

async function collectPage() {
  try {
    status("수집 중…");

    const tab = await activeTab();

    if (!tab?.id) {
      throw new Error("현재 탭을 확인할 수 없습니다.");
    }

    let response;

    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "KKOTIUM_COLLECT"
      });
    } catch {
      /*
       * content script가 아직 주입되지 않은 경우 한 번 주입을 시도합니다.
       * 사용자가 페이지를 새로고침하지 않아도 다시 수집할 수 있도록 합니다.
       */
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      });

      response = await chrome.tabs.sendMessage(tab.id, {
        type: "KKOTIUM_COLLECT"
      });
    }

    if (!response?.ok) {
      throw new Error(response?.error || "수집 실패");
    }

    items = response.items || [];

    render();

    status(`${items.length}개 수집`);
  } catch (error) {
    status("수집 실패");

    alert(
      "현재 페이지에서 수집할 수 없습니다.\n\n" +
      error.message +
      "\n\n일부 Chrome 내부 페이지(chrome:// 등)는 확장 프로그램이 접근할 수 없습니다."
    );
  }
}

async function downloadSelected() {
  const targets = selected();

  if (!targets.length) {
    alert("다운로드할 항목을 선택해주세요.");
    return;
  }

  const button = $("download");
  button.disabled = true;

  let success = 0;
  let failed = 0;

  status(`다운로드 0/${targets.length}`);

  for (let index = 0; index < targets.length; index++) {
    const item = targets[index];

    const row = document.querySelector(
      `.item[data-id="${CSS.escape(item.id)}"]`
    );

    const state = row?.querySelector(".download-state");

    if (state) {
      state.textContent = "다운로드 중…";
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: "KKOTIUM_DOWNLOAD",
        item
      });

      if (!response?.ok) {
        throw new Error(response?.error || "다운로드 시작 실패");
      }

      success++;

      if (row) {
        row.classList.remove("download-error");
        row.classList.add("download-ok");
      }

      if (state) {
        state.textContent = "다운로드 시작됨";
      }
    } catch (error) {
      failed++;

      if (row) {
        row.classList.remove("download-ok");
        row.classList.add("download-error");
      }

      if (state) {
        state.textContent = `실패 · ${error.message}`;
      }
    }

    status(`다운로드 ${index + 1}/${targets.length}`);

    /*
     * 다수 파일을 너무 빠르게 동시에 요청하지 않도록
     * 작은 간격을 둡니다.
     */
    if (index < targets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 120));
    }
  }

  button.disabled = false;

  if (failed === 0) {
    status(`${success}개 다운로드 시작`);
  } else {
    status(`${success}개 성공 · ${failed}개 실패`);
  }
}

$("collect").addEventListener("click", collectPage);

$("download").addEventListener("click", downloadSelected);

$("copy").addEventListener("click", async () => {
  const targets = selected();

  if (!targets.length) {
    alert("선택된 항목이 없습니다.");
    return;
  }

  await navigator.clipboard.writeText(
    targets.map(item => item.url).join("\n")
  );

  status(`${targets.length}개 URL 복사`);
});

$("json").addEventListener("click", () => {
  const targets = selected();

  if (!targets.length) {
    alert("선택된 항목이 없습니다.");
    return;
  }

  const data = JSON.stringify({
    version: "0.2.0",
    capturedAt: new Date().toISOString(),
    items: targets
  }, null, 2);

  const url = URL.createObjectURL(
    new Blob([data], { type: "application/json" })
  );

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `kkotium-media-${Date.now()}.json`;
  anchor.click();

  URL.revokeObjectURL(url);

  status(`${targets.length}개 JSON 저장`);
});

$("all").addEventListener("click", () => {
  document.querySelectorAll(".pick").forEach(input => {
    input.checked = true;
  });

  updateSelectionUI();
});

$("none").addEventListener("click", () => {
  document.querySelectorAll(".pick").forEach(input => {
    input.checked = false;
  });

  updateSelectionUI();
});

$("images").addEventListener("change", render);
$("videos").addEventListener("change", render);
