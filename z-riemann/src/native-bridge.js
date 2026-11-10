// Native bridge for the Android app (Capacitor).
// The web page uses browser features that Android WebView lacks:
//  - <a download> with blob: URLs (exports PNG/CSV/HTML/video) -> silently ignored
//  - navigator.share / navigator.canShare with files            -> undefined
// Here we provide them with the Filesystem and Share plugins, so the page
//  - speechSynthesis / SpeechSynthesisUtterance (tour voices)  -> missing
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

  // --- speechSynthesis (Web Speech API) on top of Android's native TTS ------
  var TTS = P.TextToSpeech;
  if (TTS) (function () {
    var voices = [], queue = [], current = null, gen = 0, listeners = {};

    function fire(type, ev) {
      var fn = synth["on" + type];
      try { if (typeof fn === "function") fn.call(synth, ev); } catch (e) {}
      (listeners[type] || []).forEach(function (l) { try { l.call(synth, ev); } catch (e) {} });
    }
    function uFire(u, type, extra) {
      var ev = { type: type, utterance: u, charIndex: 0, elapsedTime: 0, name: "" };
      if (extra) for (var k in extra) ev[k] = extra[k];
      try { if (typeof u["on" + type] === "function") u["on" + type](ev); } catch (e) {}
      (u._l[type] || []).forEach(function (l) { try { l(ev); } catch (e) {} });
    }

    function Utterance(text) {
      this.text = text == null ? "" : String(text);
      this.lang = ""; this.voice = null; this.rate = 1; this.pitch = 1; this.volume = 1;
      this.onstart = this.onend = this.onerror = this.onpause = this.onresume = this.onboundary = this.onmark = null;
      this._l = {};
    }
    Utterance.prototype.addEventListener = function (t, f) { (this._l[t] = this._l[t] || []).push(f); };
    Utterance.prototype.removeEventListener = function (t, f) { this._l[t] = (this._l[t] || []).filter(function (x) { return x !== f; }); };

    function next() {
      if (current || !queue.length) { synth.speaking = !!current; synth.pending = queue.length > 0; return; }
      var u = current = queue.shift(), my = gen;
      synth.speaking = true; synth.pending = queue.length > 0;
      var opts = {
        text: u.text,
        lang: (u.voice && u.voice.lang) || u.lang || document.documentElement.lang || "it-IT",
        rate: Math.max(0.1, Math.min(10, +u.rate || 1)),
        pitch: Math.max(0, Math.min(2, u.pitch == null ? 1 : +u.pitch)),
        volume: Math.max(0, Math.min(1, u.volume == null ? 1 : +u.volume)),
        queueStrategy: 0
      };
      if (u.voice && typeof u.voice._i === "number") opts.voice = u.voice._i;
      uFire(u, "start");
      TTS.speak(opts).then(function () {
        if (my !== gen) return;
        current = null; uFire(u, "end"); next();
      }, function (e) {
        if (my !== gen) return;
        current = null; uFire(u, "error", { error: "synthesis-failed", message: (e && e.message) || "" }); next();
      });
    }

    var synth = {
      speaking: false, pending: false, paused: false, onvoiceschanged: null,
      getVoices: function () { return voices.slice(); },
      speak: function (u) { if (!(u instanceof Utterance)) return; queue.push(u); next(); },
      cancel: function () {
        gen++;
        var dropped = (current ? [current] : []).concat(queue);
        current = null; queue = []; synth.speaking = synth.pending = false;
        try { TTS.stop(); } catch (e) {}
        dropped.forEach(function (u) { uFire(u, "error", { error: "interrupted" }); });
      },
      pause: function () {}, resume: function () {},
      addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); },
      removeEventListener: function (t, f) { listeners[t] = (listeners[t] || []).filter(function (x) { return x !== f; }); }
    };

    try { Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true }); }
    catch (e) { window.speechSynthesis = synth; }
    window.SpeechSynthesisUtterance = Utterance;

    // Load the device voices (names like "en-us-x-sfg-local"), then notify the page.
    // The Android TTS engine initialises asynchronously: retry until it answers.
    var tries = 0;
    function loadVoices() {
      TTS.getSupportedVoices().then(function (r) {
        var list = (r && r.voices) || [];
        if (!list.length && ++tries < 20) return setTimeout(loadVoices, 500);
        voices = list.map(function (v, i) {
          return {
            _i: i, name: v.name || v.voiceURI || ("voice " + i), voiceURI: v.voiceURI || v.name || "",
            lang: String(v.lang || "").replace("_", "-"), localService: v.localService !== false, default: !!v["default"]
          };
        });
        fire("voiceschanged", { type: "voiceschanged" });
      }).catch(function () { if (++tries < 20) setTimeout(loadVoices, 500); });
    }
    loadVoices();
  })();

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
