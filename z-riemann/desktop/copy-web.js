// Copies the web app (../src/zeta-riemann.html) into app/index.html.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "src", "zeta-riemann.html");
const dest = path.join(__dirname, "app");
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
fs.copyFileSync(src, path.join(dest, "index.html"));
console.log(`Copied ${src} -> ${dest}/index.html`);
