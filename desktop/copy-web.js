// Copies the React production build (frontend/build) into desktop/app.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "frontend", "build");
const dest = path.join(__dirname, "app");

if (!fs.existsSync(path.join(src, "index.html"))) {
  console.error("frontend/build not found: run `yarn build` in frontend first.");
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
