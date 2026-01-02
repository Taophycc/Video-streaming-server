import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hlsFolder = path.join(__dirname, "../../storage/hls");

export const serveHLS = (req, res) => {
  const relativePath = req.url.replace("/hls/", "").split("?")[0];
  const filePath = path.join(hlsFolder, relativePath);

  if (!filePath.startsWith(hlsFolder)) {
     res.writeHead(403);
     res.end("Forbidden");
     return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  let contentType = "application/octet-stream";
  if (filePath.endsWith(".m3u8")) contentType = "application/vnd.apple.mpegurl";
  if (filePath.endsWith(".ts")) contentType = "video/MP2T";
  if (filePath.endsWith(".vtt")) contentType = "text/vtt";

  res.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(filePath).pipe(res);
};