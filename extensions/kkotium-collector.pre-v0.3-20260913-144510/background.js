const api = chrome;

api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "KKOTIUM_DOWNLOAD") {
    return;
  }

  const url = message.item?.url;

  if (!url) {
    sendResponse({
      ok: false,
      error: "URL 없음"
    });
    return;
  }

  let parsed;

  try {
    parsed = new URL(url);
  } catch {
    sendResponse({
      ok: false,
      error: "올바르지 않은 URL"
    });
    return;
  }

  /*
   * 일반 HTTP/HTTPS URL만 파일 다운로드 대상으로 처리합니다.
   * blob:, data:, javascript: 등은 chrome.downloads.download()
   * 로 직접 저장하는 방식이 적합하지 않습니다.
   */
  if (!["http:", "https:"].includes(parsed.protocol)) {
    sendResponse({
      ok: false,
      error: "일반 HTTP/HTTPS 파일 URL이 아닙니다."
    });
    return;
  }

  const kind = message.item?.kind === "video"
    ? "video"
    : "image";

  const extension = (() => {
    try {
      const pathname = parsed.pathname;
      const match = pathname.match(/\.([a-z0-9]{2,5})$/i);

      if (!match) return "";

      return `.${match[1].toLowerCase()}`;
    } catch {
      return "";
    }
  })();

  const filename =
    `kkotium-collector/${kind}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}${extension}`;

  chrome.downloads.download({
    url,
    filename,
    saveAs: false,
    conflictAction: "uniquify"
  })
    .then(downloadId => {
      sendResponse({
        ok: true,
        id: downloadId
      });
    })
    .catch(error => {
      sendResponse({
        ok: false,
        error: error?.message || String(error)
      });
    });

  /*
   * 비동기 sendResponse를 사용하므로 반드시 true를 반환합니다.
   * Chrome runtime.onMessage 공식 동작과 일치합니다.
   */
  return true;
});
