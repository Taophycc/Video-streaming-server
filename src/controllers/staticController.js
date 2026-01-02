import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicFolder = path.join(__dirname, "../../public");

export const serveDashboard = (_req, res) => {
  const htmlPath = path.join(publicFolder, "index.html");

  if (!fs.existsSync(htmlPath)) {
    console.error(`ERROR: Could not find file at ${htmlPath}`);
    res.writeHead(404);
    res.end("Dashboard not found");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" });
  fs.createReadStream(htmlPath).pipe(res);
};
