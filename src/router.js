import { setCorsHeaders } from "./config/cors.js";
import { serveHLS } from "./controllers/mediaController.js";
import { serveDashboard } from "./controllers/staticController.js";

export const router = (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url.startsWith("/hls/")) {
    serveHLS(req, res);
  } 
  else if (req.url === "/") {
    serveDashboard(req, res);
  } 
  else {
    res.writeHead(404);
    res.end("Not Found");
  }
};