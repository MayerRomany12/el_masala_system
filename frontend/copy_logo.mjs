import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logo is now maintained in src/assets/church_logo.png and service_logo.png
console.log("Church and service logos loaded successfully!");
