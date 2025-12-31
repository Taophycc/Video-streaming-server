import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hlsFolder = path.join(__dirname, "../storage/hls");

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Handle HLS and Subtitles requests
  if (req.url.startsWith("/hls/")) {
    const relativePath = req.url.replace("/hls/", "").split("?")[0];
    const filePath = path.join(hlsFolder, relativePath);

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    let contentType = "application/octet-stream";
    if (filePath.endsWith(".m3u8"))
      contentType = "application/vnd.apple.mpegurl";
    if (filePath.endsWith(".ts")) contentType = "video/MP2T";
    if (filePath.endsWith(".vtt")) contentType = "text/vtt";

    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  }

  // THE DASHBOARD (frontend)
  else if (req.url === "/") {
    const htmlPath = path.join(__dirname, "../index.html");
    res.writeHead(200, { "Content-Type": "text/html" });
    fs.createReadStream(htmlPath).pipe(res);
  }
});

server.listen(3000, () =>
  console.log("Server running at http://localhost:3000/")
);
