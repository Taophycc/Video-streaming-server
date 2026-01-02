import { createRequire } from "module";
const require = createRequire(import.meta.url);

require.cache["sharp"] = {
  exports: () => ({
    on: () => ({}),
    resize: () => ({}),
    toFile: () => Promise.resolve(),
  }),
};

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";
import { fileURLToPath } from "url";

import {
  transcode,
  createMasterPlaylist,
  generateThumbnailSprite,
} from "./ffmpegService.js";
import { generateThumbnailVTT } from "./thumbnailService.js";
import { generateSubtitles } from "./aiService.js";

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storageDir = path.join(__dirname, "../../storage");
const hlsFolder = path.join(storageDir, "hls");
const inputFile = path.join(storageDir, "video.mp4");

const getVideoHeight = async (filePath) => {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=s=x:p=0 "${filePath}"`
    );
    return parseInt(stdout.trim());
  } catch (err) {
    console.error("⚠️ FFprobe height check failed. Defaulting to 1080p.");
    return 1080;
  }
};

const getVideoDuration = async (filePath) => {
  try {
    const { stdout } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
    );
    return parseFloat(stdout.trim());
  } catch (err) {
    console.error("⚠️ FFprobe duration check failed. Defaulting to 0.");
    return 0;
  }
};

export const processVideo = async () => {
  try {
    if (fs.existsSync(hlsFolder)) {
      console.log("🧹 Cleaning up old HLS files...");
      fs.rmSync(hlsFolder, { recursive: true, force: true });
    }
    fs.mkdirSync(hlsFolder, { recursive: true });

    console.log("📏 Checking input stats...");
    const inputHeight = await getVideoHeight(inputFile);
    const duration = await getVideoDuration(inputFile);

    console.log(`Stats: ${inputHeight}p, ${duration.toFixed(2)}s`);

    const promises = [
      generateSubtitles(inputFile, hlsFolder),

      generateThumbnailSprite(inputFile, hlsFolder, duration).then(() =>
        generateThumbnailVTT(hlsFolder, duration)
      ),
    ];

    promises.push(transcode(inputFile, hlsFolder, "640x360", "360p", "800k"));

    if (inputHeight >= 720) {
      promises.push(
        transcode(inputFile, hlsFolder, "1280x720", "720p", "2500k")
      );
    }

    if (inputHeight >= 1080) {
      promises.push(
        transcode(inputFile, hlsFolder, "1920x1080", "1080p", "5000k")
      );
    }

    await Promise.all(promises);

    createMasterPlaylist(hlsFolder, inputHeight);

    console.log("✅ ALL DONE!");
  } catch (err) {
    console.error("❌ Processing Error:", err);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  processVideo();
}
