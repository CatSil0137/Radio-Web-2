// Native bridge for the Android app (Capacitor).
// The web page uses browser features that Android WebView lacks:
//  - <a download> with blob: URLs (exports PNG/CSV/HTML/video) -> silently ignored
//  - navigator.share / navigator.canShare with files            -> undefined
// Here we provide them with the Filesystem and Share plugins, so the page
// works unchanged. Outside the app (normal browser) this script does nothing.
(function () {
  var Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  var P = Cap.Plugins || {};
  var FS = P.Filesystem, SH = P.Share;
  if (!FS || !SH) return;

  var FOLDER = "Z Riemann Visualizer";

  function toast(msg) {
    try {
      var d = document.createElement("div");
      d.textContent = msg;
      d.style.cssText =
        "position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));" +
        "transform:translateX(-50%);max-width:90vw;z-index:2147483647;" +
        "background:rgba(20,20,20,.92);color:#fff;padding:10px 14px;border-radius:10px;" +
        "font:14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.4);text-align:center";
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 3500);
    } catch (e) {}
  }

  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1] || ""); };
      r.onerror = function () { rej(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function safeName(name) {
    return String(name || "file").replace(/[\\/:*?"<>|]+/g, "_");
  }

  // Writes the file to the app cache and returns its native URI (for sharing).
  async function writeCache(name, blob) {
    var data = await blobToBase64(blob);
    var r = await FS.writeFile({ path: "share/" + safeName(name), data: data, directory: "CACHE", recursive: true });
    return r.uri;
  }

  async function shareFiles(files, title, text) {
    var uris = [];
    for (var i = 0; i < files.length; i++) uris.push(await writeCache(files[i].name, files[i]));
    await SH.share({ title: title || (files[0] && files[0].name) || "", text: text || undefined, files: uris, dialogTitle: "Salva o condividi" });
  }

  // Save a downloaded file in Documents/<FOLDER>; if not possible, open the share sheet.
  async function saveDownload(name, blob) {
    name = safeName(name);
    try {
      var data = await blobToBase64(blob);
      await FS.writeFile({ path: FOLDER + "/" + name, data: data, directory: "DOCUMENTS", recursive: true });
      toast("Salvato in Documenti/" + FOLDER + "/" + name);
    } catch (e) {
      try { await shareFiles([new File([blob], name, { type: blob.type })], name); }
      catch (e2) { if (!/cancel/i.test(String(e2 && e2.message))) toast("Salvataggio non riuscito: " + ((e2 && e2.message) || e2)); }
    }
  }

  // --- navigator.share / canShare -------------------------------------------
  navigator.canShare = function (d) {
    return !!d && (!!(d.files && d.files.length) || !!d.url || !!d.text || !!d.title);
  };
  navigator.share = async function (d) {
    d = d || {};
    try {
      if (d.files && d.files.length) return await shareFiles(Array.from(d.files), d.title, d.text);
      await SH.share({ title: d.title, text: d.text, url: d.url, dialogTitle: "Condividi" });
    } catch (e) {
      // User closed the sheet: behave like the browser (AbortError).
      var err = new Error((e && e.message) || "Share canceled");
      err.name = "AbortError";
      throw err;
    }
  };

  // --- <a download> ------------------------------------------------------------
  function handleAnchor(a) {
    if (!a || !a.hasAttribute || !a.hasAttribute("download")) return false;
    var href = a.href || "";
    if (!/^(blob:|data:)/i.test(href)) return false;
    var name = a.getAttribute("download") || "file";
    fetch(href).then(function (r) { return r.blob(); }).then(function (b) { return saveDownload(name, b); })
      .catch(function (e) { toast("Salvataggio non riuscito: " + ((e && e.message) || e)); });
    return true;
  }

  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (handleAnchor(this)) return;
    return origClick.apply(this, arguments);
  };
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[download]") : null;
    if (a && handleAnchor(a)) ev.preventDefault();
  }, true);

  // External http(s) links: open in the system browser instead of inside the app.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a || a.hasAttribute("download")) return;
    var u = a.href || "";
    if (/^https?:\/\//i.test(u) && u.indexOf(location.origin) !== 0) {
      ev.preventDefault();
      window.open(u, "_system");
    }
  }, true);
})();
