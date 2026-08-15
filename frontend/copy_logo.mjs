import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = "C:/Users/Mayer_R/.gemini/antigravity-ide/brain/6730460c-7e7a-4095-a1ab-a58973a90b03/media__1786743334870.jpg";
const dst = path.join(__dirname, "src", "assets", "church_logo.png");

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dst);
    console.log("Logo copied to src/assets/church_logo.png successfully!");
  }
} catch (e) {
  console.error("Error copying logo:", e);
}
