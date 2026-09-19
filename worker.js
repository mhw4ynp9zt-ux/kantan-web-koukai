/* =============================================================
 * かんたんWeb公開 - Cloudflare Workers 単一ファイル版
 * Cloudflareダッシュボードの「Edit Code」に、このファイルの中身を
 * まるごとコピー＆ペーストしてください。
 * ============================================================= */

const TOP_PAGE_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>かんたんWeb公開</title>
<style>
  :root {
    --accent: #3b82f6;
    --accent-dark: #2563eb;
    --bg: #f5f5f7;
    --card: #ffffff;
    --text: #1d1d1f;
    --muted: #86868b;
    --border: #d2d2d7;
    --danger: #dc2626;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .card {
    width: 100%;
    max-width: 480px;
    background: var(--card);
    border-radius: 20px;
    padding: 32px 24px;
    box-shadow: 0 2px 24px rgba(0,0,0,0.06);
    text-align: center;
  }
  h1 { font-size: 24px; margin: 0 0 8px; }
  .subtitle { color: var(--muted); font-size: 14px; margin: 0 0 24px; line-height: 1.6; }

  .dropzone {
    border: 2px dashed var(--border);
    border-radius: 16px;
    padding: 40px 16px;
    cursor: pointer;
    transition: border-color .15s, background .15s;
  }
  .dropzone.drag-over { border-color: var(--accent); background: #eff6ff; }
  .dropzone .icon { font-size: 48px; line-height: 1; margin-bottom: 12px; }
  .dropzone .main-text { font-size: 16px; font-weight: 600; margin-bottom: 16px; }

  .choose-btn, .action-btn {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 12px 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    width: 100%;
    max-width: 260px;
  }
  .choose-btn:active, .action-btn:active { background: var(--accent-dark); }
  .choose-btn:disabled { opacity: .5; }

  .hint { color: var(--muted); font-size: 12px; margin-top: 20px; }

  .progress-wrap { margin-top: 24px; }
  .progress-bar-bg {
    background: #e5e5ea; border-radius: 8px; height: 10px; overflow: hidden;
  }
  .progress-bar-fill {
    background: var(--accent); height: 100%; width: 0%; transition: width .15s;
  }
  .progress-text { margin-top: 8px; font-size: 13px; color: var(--muted); }

  .hidden { display: none !important; }

  .result-emoji { font-size: 40px; margin-bottom: 8px; }
  .result-title { font-size: 20px; font-weight: 700; margin-bottom: 20px; }
  .result-url {
    font-size: 15px; word-break: break-all; background: #f5f5f7;
    border-radius: 10px; padding: 14px; margin-bottom: 20px; color: var(--accent-dark);
    font-weight: 600;
  }
  .btn-stack { display: flex; flex-direction: column; gap: 10px; align-items: center; }
  .btn-secondary {
    background: #fff; color: var(--text); border: 1px solid var(--border);
  }
  .btn-danger { background: #fff; color: var(--danger); border: 1px solid var(--danger); }

  .error-box {
    margin-top: 16px; background: #fef2f2; color: var(--danger);
    border-radius: 10px; padding: 12px 14px; font-size: 14px; text-align: left;
  }
  .toast {
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: #1d1d1f; color: #fff; padding: 10px 18px; border-radius: 20px;
    font-size: 13px; opacity: 0; transition: opacity .2s; pointer-events: none;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>

<div class="card">

  <!-- 初期画面 / アップロード画面 -->
  <div id="uploadScreen">
    <h1>かんたんWeb公開</h1>
    <p class="subtitle">Webサイトのフォルダを選ぶだけで、<br>すぐに公開できます。</p>

    <div id="dropzone" class="dropzone">
      <div class="icon">📁</div>
      <div class="main-text">Webサイトのフォルダを<br>ここにドロップ</div>
      <button id="chooseBtn" type="button" class="choose-btn">ファイルを選択</button>
    </div>

    <p class="hint">HTML / CSS / JavaScript / 画像などに対応</p>

    <div id="progressWrap" class="progress-wrap hidden">
      <div class="progress-bar-bg"><div id="progressFill" class="progress-bar-fill"></div></div>
      <div id="progressText" class="progress-text">アップロードしています…</div>
    </div>

    <div id="errorBox" class="error-box hidden"></div>
  </div>

  <!-- 完了画面 -->
  <div id="resultScreen" class="hidden">
    <div class="result-emoji">🎉</div>
    <div class="result-title">公開しました！</div>
    <div id="resultUrl" class="result-url"></div>
    <div class="btn-stack">
      <button id="openBtn" type="button" class="action-btn">サイトを開く</button>
      <button id="copyBtn" type="button" class="action-btn btn-secondary">URLをコピー</button>
      <button id="newBtn" type="button" class="action-btn btn-secondary">新しいサイトを公開</button>
      <button id="deleteBtn" type="button" class="action-btn btn-danger">このサイトを削除</button>
    </div>
  </div>

</div>

<input type="file" id="fileInput" webkitdirectory directory multiple class="hidden">
<div id="toast" class="toast"></div>

<script>
(function () {
  var dropzone = document.getElementById('dropzone');
  var chooseBtn = document.getElementById('chooseBtn');
  var fileInput = document.getElementById('fileInput');
  var uploadScreen = document.getElementById('uploadScreen');
  var resultScreen = document.getElementById('resultScreen');
  var progressWrap = document.getElementById('progressWrap');
  var progressFill = document.getElementById('progressFill');
  var progressText = document.getElementById('progressText');
  var errorBox = document.getElementById('errorBox');
  var resultUrl = document.getElementById('resultUrl');
  var toast = document.getElementById('toast');

  var isUploading = false;
  var currentSiteId = null;
  var currentToken = null;
  var currentUrl = null;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2000);
  }

  function showError(msg) {
    errorBox.textContent = msg;
    errorBox.classList.remove('hidden');
  }

  function clearError() {
    errorBox.classList.add('hidden');
    errorBox.textContent = '';
  }

  function resetToUploadScreen() {
    resultScreen.classList.add('hidden');
    uploadScreen.classList.remove('hidden');
    progressWrap.classList.add('hidden');
    progressFill.style.width = '0%';
    clearError();
    isUploading = false;
    chooseBtn.disabled = false;
    currentSiteId = null;
    currentToken = null;
    currentUrl = null;
  }

  chooseBtn.addEventListener('click', function () {
    if (isUploading) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', function (e) {
    var files = Array.prototype.slice.call(e.target.files);
    if (files.length === 0) return;
    var entries = files.map(function (f) {
      return { file: f, path: f.webkitRelativePath || f.name };
    });
    startUpload(entries);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.add('drag-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    dropzone.addEventListener(evt, function (e) {
      e.preventDefault();
      e.stopPropagation();
      dropzone.classList.remove('drag-over');
    });
  });

  dropzone.addEventListener('drop', function (e) {
    if (isUploading) return;
    var items = e.dataTransfer.items;
    if (!items || items.length === 0) {
      var files = Array.prototype.slice.call(e.dataTransfer.files || []);
      if (files.length > 0) {
        startUpload(files.map(function (f) { return { file: f, path: f.name }; }));
      }
      return;
    }

    var entryPromises = [];
    for (var i = 0; i < items.length; i++) {
      var entry = items[i].webkitGetAsEntry && items[i].webkitGetAsEntry();
      if (entry) entryPromises.push(readEntry(entry, ''));
    }

    Promise.all(entryPromises).then(function (results) {
      var flat = [].concat.apply([], results);
      if (flat.length === 0) {
        showError('ファイルを読み取れませんでした。もう一度お試しください。');
        return;
      }
      startUpload(flat);
    });
  });

  // FileSystemEntry を再帰的に読み取り、{file, path} の配列にする
  function readEntry(entry, prefix) {
    return new Promise(function (resolve) {
      if (entry.isFile) {
        entry.file(function (file) {
          resolve([{ file: file, path: prefix + entry.name }]);
        }, function () { resolve([]); });
      } else if (entry.isDirectory) {
        var reader = entry.createReader();
        var allEntries = [];
        function readBatch() {
          reader.readEntries(function (batch) {
            if (batch.length === 0) {
              Promise.all(
                allEntries.map(function (e) { return readEntry(e, prefix + entry.name + '/'); })
              ).then(function (nested) {
                resolve([].concat.apply([], nested));
              });
            } else {
              allEntries = allEntries.concat(batch);
              readBatch();
            }
          }, function () { resolve([]); });
        }
        readBatch();
      } else {
        resolve([]);
      }
    });
  }

  function startUpload(entries) {
    if (isUploading) return;
    clearError();

    var hasIndex = entries.some(function (e) {
      var normalized = e.path.replace(/\\\\/g, '/');
      var segments = normalized.split('/').filter(Boolean);
      return segments[segments.length - 1].toLowerCase() === 'index.html';
    });
    if (!hasIndex) {
      showError('index.html が見つかりません。Webサイトのトップページとなる index.html を入れてください。');
      return;
    }

    isUploading = true;
    chooseBtn.disabled = true;
    progressWrap.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'アップロードしています…';

    var formData = new FormData();
    entries.forEach(function (e) {
      formData.append('files', e.file, e.path);
    });

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');

    xhr.upload.addEventListener('progress', function (e) {
      if (e.lengthComputable) {
        var pct = Math.round((e.loaded / e.total) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = 'アップロードしています… ' + pct + '%';
      }
    });

    xhr.onload = function () {
      isUploading = false;
      chooseBtn.disabled = false;
      progressWrap.classList.add('hidden');

      var data = null;
      try { data = JSON.parse(xhr.responseText); } catch (e) {}

      if (xhr.status === 200 && data && data.ok) {
        currentSiteId = data.id;
        currentToken = data.token;
        currentUrl = data.url;
        showResult(data.url);
      } else {
        var msg = (data && data.error) || 'アップロードに失敗しました。もう一度お試しください。';
        showError(msg);
      }
    };

    xhr.onerror = function () {
      isUploading = false;
      chooseBtn.disabled = false;
      progressWrap.classList.add('hidden');
      showError('通信に失敗しました。ネットワークを確認してください。');
    };

    xhr.send(formData);
  }

  function showResult(url) {
    uploadScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    resultUrl.textContent = url;
  }

  document.getElementById('openBtn').addEventListener('click', function () {
    if (currentUrl) window.open(currentUrl, '_blank');
  });

  document.getElementById('copyBtn').addEventListener('click', function () {
    if (!currentUrl) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(currentUrl).then(function () {
        showToast('URLをコピーしました！');
      }, function () {
        showToast('コピーに失敗しました');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = currentUrl;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); showToast('URLをコピーしました！'); }
      catch (e) { showToast('コピーに失敗しました'); }
      document.body.removeChild(ta);
    }
  });

  document.getElementById('newBtn').addEventListener('click', function () {
    resetToUploadScreen();
  });

  document.getElementById('deleteBtn').addEventListener('click', function () {
    if (!currentSiteId || !currentToken) return;
    if (!confirm('このWebサイトを削除しますか？\\n削除するとURLからアクセスできなくなります。')) return;

    fetch('/api/delete/' + currentSiteId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: currentToken }),
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (r) {
        if (r.data && r.data.ok) {
          showToast('削除しました');
          resetToUploadScreen();
        } else {
          showToast((r.data && r.data.error) || '削除に失敗しました');
        }
      })
      .catch(function () {
        showToast('通信に失敗しました。ネットワークを確認してください。');
      });
  });
})();
</script>
</body>
</html>`;


/* =========================================================
 * 設定（必要に応じてここだけ変更すればOK）
 * ========================================================= */
const MAX_FILE_SIZE = 5 * 1024 * 1024;      // 1ファイルあたりの最大サイズ（5MB）
const MAX_TOTAL_SIZE = 25 * 1024 * 1024;    // サイト全体の最大合計サイズ（25MB）
const MAX_FILE_COUNT = 300;                 // 1サイトあたりの最大ファイル数
const EXPIRATION_DAYS = 7;                  // 公開期間（日数）

// アップロードを拒否する拡張子（実行可能ファイル対策）
const DANGEROUS_EXTENSIONS = new Set([
  "php", "php3", "php4", "php5", "phtml",
  "exe", "sh", "bash", "bat", "cmd", "com", "msi", "app",
  "py", "rb", "pl", "cgi", "jsp", "jspx", "asp", "aspx",
  "dll", "so", "jar", "war", "class", "wasm",
]);

const MIME_TYPES = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  xml: "application/xml; charset=utf-8",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  pdf: "application/pdf",
  map: "application/json; charset=utf-8",
};

/* =========================================================
 * ルーティング
 * ========================================================= */
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      if (path === "/" && request.method === "GET") {
        return htmlResponse(TOP_PAGE_HTML);
      }

      if (path === "/favicon.ico") {
        return new Response(null, { status: 204 });
      }

      if (path === "/api/upload" && request.method === "POST") {
        return await handleUpload(request, env);
      }

      const deleteMatch = path.match(/^\/api\/delete\/([a-z0-9]+)$/i);
      if (deleteMatch && request.method === "POST") {
        return await handleDelete(request, env, deleteMatch[1]);
      }

      // それ以外は公開サイトの配信として扱う
      return await serveSite(request, env, path);
    } catch (err) {
      return jsonError("サーバーエラーが発生しました。もう一度お試しください。", 500);
    }
  },

  // 定期実行（Cronトリガー）：期限切れサイトを完全削除してストレージを解放する
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupExpiredSites(env));
  },
};

/* =========================================================
 * アップロード処理
 * ========================================================= */
async function handleUpload(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return jsonError("アップロードに失敗しました。もう一度お試しください。", 400);
  }

  const rawFiles = formData.getAll("files");
  if (!rawFiles || rawFiles.length === 0) {
    return jsonError("アップロードするファイルが見つかりません。", 400);
  }

  if (rawFiles.length > MAX_FILE_COUNT) {
    return jsonError(
      `ファイル数が多すぎます（最大 ${MAX_FILE_COUNT} 件まで）。`,
      400
    );
  }

  // ファイル情報を集める（name プロパティに相対パスが入っている想定）
  const entries = [];
  let totalSize = 0;

  for (const item of rawFiles) {
    if (!(item instanceof File)) continue;

    const size = item.size;
    totalSize += size;

    if (size > MAX_FILE_SIZE) {
      return jsonError(
        `ファイルサイズが大きすぎます（1ファイルあたり最大 ${formatMB(MAX_FILE_SIZE)}）。`,
        400
      );
    }

    const safePath = sanitizeRelativePath(item.name);
    if (safePath === null) {
      return jsonError("使用できないファイルパスが含まれています。", 400);
    }

    const ext = getExtension(safePath);
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return jsonError(
        "実行可能ファイル（.php / .exe / .py など）はアップロードできません。",
        400
      );
    }

    entries.push({ file: item, path: safePath });
  }

  if (totalSize > MAX_TOTAL_SIZE) {
    return jsonError(
      `合計ファイルサイズが大きすぎます（最大 ${formatMB(MAX_TOTAL_SIZE)}）。`,
      400
    );
  }

  // ドラッグ＆ドロップしたフォルダ名だけが共通の先頭階層になっている場合は取り除く
  // 例: my-site/index.html, my-site/style.css → index.html, style.css
  const strippedEntries = stripCommonRootFolder(entries);

  const hasIndex = strippedEntries.some(
    (e) => e.path.toLowerCase() === "index.html"
  );
  if (!hasIndex) {
    return jsonError(
      "index.html が見つかりません。Webサイトのトップページとなる index.html を入れてください。",
      400
    );
  }

  const id = generateId();
  const token = generateToken();
  const tokenHash = await sha256Hex(token);

  try {
    for (const entry of strippedEntries) {
      const key = `sites/${id}/${entry.path}`;
      const buf = await entry.file.arrayBuffer();
      await env.SITES_BUCKET.put(key, buf, {
        httpMetadata: { contentType: getMimeType(entry.path) },
      });
    }

    const meta = {
      createdAt: Date.now(),
      tokenHash,
      fileCount: strippedEntries.length,
      totalSize,
    };
    await env.SITES_BUCKET.put(`meta/${id}.json`, JSON.stringify(meta), {
      httpMetadata: { contentType: "application/json" },
    });
  } catch (e) {
    return jsonError("アップロードに失敗しました。もう一度お試しください。", 500);
  }

  const siteUrl = new URL(`/${id}/`, request.url).toString();

  return new Response(
    JSON.stringify({ ok: true, id, url: siteUrl, token }),
    { status: 200, headers: { "Content-Type": "application/json; charset=utf-8" } }
  );
}

// 全ファイルの相対パスの先頭セグメントが共通なら、それを取り除く
function stripCommonRootFolder(entries) {
  if (entries.length === 0) return entries;
  const firstSegments = entries.map((e) => e.path.split("/")[0]);
  const allHaveSubpath = entries.every((e) => e.path.includes("/"));
  const allSameRoot = firstSegments.every((s) => s === firstSegments[0]);

  if (allHaveSubpath && allSameRoot) {
    return entries.map((e) => ({
      file: e.file,
      path: e.path.slice(firstSegments[0].length + 1),
    }));
  }
  return entries;
}

/* =========================================================
 * サイト配信
 * ========================================================= */
async function serveSite(request, env, pathname) {
  const parts = pathname.replace(/^\/+/, "").split("/");
  const id = parts.shift();

  if (!id || !/^[a-z0-9]+$/i.test(id)) {
    return notFoundPage();
  }

  const meta = await getMeta(env, id);
  if (!meta) {
    return notFoundPage();
  }

  const ageMs = Date.now() - meta.createdAt;
  if (ageMs > EXPIRATION_DAYS * 24 * 60 * 60 * 1000) {
    return expiredPage();
  }

  let restPath = parts.join("/");
  if (restPath === "" || restPath.endsWith("/")) {
    restPath += "index.html";
  }
  const safePath = sanitizeRelativePath(restPath);
  if (safePath === null) {
    return notFoundPage();
  }

  const obj = await env.SITES_BUCKET.get(`sites/${id}/${safePath}`);
  if (!obj) {
    return notFoundPage();
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    obj.httpMetadata?.contentType || getMimeType(safePath)
  );
  headers.set("Cache-Control", "public, max-age=300");
  return new Response(obj.body, { status: 200, headers });
}

async function getMeta(env, id) {
  const obj = await env.SITES_BUCKET.get(`meta/${id}.json`);
  if (!obj) return null;
  try {
    return JSON.parse(await obj.text());
  } catch (e) {
    return null;
  }
}

/* =========================================================
 * 削除処理
 * ========================================================= */
async function handleDelete(request, env, id) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonError("削除に失敗しました。", 400);
  }

  const token = body?.token;
  if (!token) {
    return jsonError("削除用のトークンがありません。", 403);
  }

  const meta = await getMeta(env, id);
  if (!meta) {
    return jsonError("サイトが見つかりません。", 404);
  }

  const tokenHash = await sha256Hex(token);
  if (tokenHash !== meta.tokenHash) {
    return jsonError("削除する権限がありません。", 403);
  }

  await deleteSiteFiles(env, id);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function deleteSiteFiles(env, id) {
  let cursor;
  do {
    const listed = await env.SITES_BUCKET.list({
      prefix: `sites/${id}/`,
      cursor,
    });
    if (listed.objects.length > 0) {
      await Promise.all(
        listed.objects.map((o) => env.SITES_BUCKET.delete(o.key))
      );
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);

  await env.SITES_BUCKET.delete(`meta/${id}.json`);
}

/* =========================================================
 * 期限切れサイトの自動掃除（Cronトリガーから呼ばれる）
 * ========================================================= */
async function cleanupExpiredSites(env) {
  const expireMs = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
  let cursor;
  do {
    const listed = await env.SITES_BUCKET.list({ prefix: "meta/", cursor });
    for (const obj of listed.objects) {
      const metaObj = await env.SITES_BUCKET.get(obj.key);
      if (!metaObj) continue;
      try {
        const meta = JSON.parse(await metaObj.text());
        if (Date.now() - meta.createdAt > expireMs) {
          const id = obj.key.replace(/^meta\//, "").replace(/\.json$/, "");
          await deleteSiteFiles(env, id);
        }
      } catch (e) {
        // 壊れたメタデータは無視
      }
    }
    cursor = listed.truncated ? listed.cursor : undefined;
  } while (cursor);
}

/* =========================================================
 * ユーティリティ
 * ========================================================= */
function sanitizeRelativePath(rawPath) {
  if (typeof rawPath !== "string" || rawPath.length === 0) return null;

  let p = rawPath.replace(/\\/g, "/");
  p = p.replace(/^\/+/, "");

  if (p.includes("\0")) return null;

  const segments = p.split("/").filter((s) => s.length > 0);
  if (segments.length === 0) return null;

  for (const seg of segments) {
    if (seg === "." || seg === "..") return null;
  }

  return segments.join("/");
}

function getExtension(path) {
  const idx = path.lastIndexOf(".");
  if (idx === -1) return "";
  return path.slice(idx + 1).toLowerCase();
}

function getMimeType(path) {
  const ext = getExtension(path);
  return MIME_TYPES[ext] || "application/octet-stream";
}

function generateId() {
  // 推測困難なランダムID（英数字10文字、約50ビットのランダム性）
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
}

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatMB(bytes) {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

function htmlResponse(html) {
  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function jsonError(message, status) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function notFoundPage() {
  return new Response(
    errorPageHtml("404 - サイトが見つかりません", "指定されたサイトは存在しません。URLをご確認ください。"),
    { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function expiredPage() {
  return new Response(
    errorPageHtml("公開期間が終了しました", `このサイトは公開から ${EXPIRATION_DAYS} 日を過ぎたため表示できません。`),
    { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

function errorPageHtml(title, message) {
  return `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Hiragino Sans","Yu Gothic",sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;
    background:#f5f5f7;color:#333;text-align:center;padding:24px;box-sizing:border-box;}
  h1{font-size:20px;margin-bottom:8px;}
  p{color:#666;font-size:15px;}
</style></head>
<body><div><h1>${title}</h1><p>${message}</p></div></body></html>`;
}
