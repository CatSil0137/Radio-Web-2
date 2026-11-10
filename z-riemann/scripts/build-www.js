// Builds www/ (the folder Capacitor packages into the APK) from src/:
// copies the web app as index.html and injects the native bridge script.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "src");
const www = path.join(root, "www");

fs.rmSync(www, { recursive: true, force: true });
fs.mkdirSync(www, { recursive: true });

let html = fs.readFileSync(path.join(src, "zeta-riemann.html"), "utf8");
const tag = '<script src="native-bridge.js"></script>';
if (!/<head[^>]*>/i.test(html)) throw new Error("<head> not found in zeta-riemann.html");
html = html.replace(/<head[^>]*>/i, (m) => `${m}\n${tag}`);

fs.writeFileSync(path.join(www, "index.html"), html);
fs.copyFileSync(path.join(src, "native-bridge.js"), path.join(www, "native-bridge.js"));
console.log(`www/index.html: ${(html.length / 1e6).toFixed(1)} MB`);
