import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

export const transcode = (
  inputFile,
  outputFolder,
  resolution,
  variantName,
  bitrate
) => {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${resolution} chop...`);

    const variantFolder = path.join(outputFolder, variantName);
    ensureDir(variantFolder);

    ffmpeg(inputFile)
      .format("hls")
      .videoCodec("libx264")
      .audioCodec("aac")
      .size(resolution)
      .videoBitrate(bitrate)
      .autoPad(true, "black")
      .outputOptions([
        "-hls_time 4",
        "-hls_list_size 0",
        "-hls_segment_filename",
        path.join(variantFolder, "segment_%03d.ts"),
        "-force_key_frames expr:gte(t,n_forced*4)",
        "-sc_threshold 0",
        "-g 48",
        "-keyint_min 48",
      ])
      .save(path.join(variantFolder, "playlist.m3u8"))
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
};

export const generateThumbnailSprite = (inputFile, outputFolder, duration) => {
  return new Promise((resolve, reject) => {
    const interval = 10;
    const cols = 16;
    const totalImages = Math.ceil(duration / interval);
    const rows = Math.ceil(totalImages / cols);

    console.log(
      `📸 Generating Sprite: ${cols}x${rows} grid for ${totalImages} thumbnails...`
    );

    const outputPath = path.join(outputFolder, "thumbnails.jpg");

    ffmpeg(inputFile)
      .complexFilter([`fps=1/${interval},scale=160:90,tile=${cols}x${rows}`])
      .outputOptions(["-frames:v 1", "-q:v 2"])
      .output(outputPath)
      .on("end", () => {
        console.log("✅ Sprite Sheet Created: thumbnails.jpg");
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ Sprite Generation Failed:", err);
        reject(err);
      })
      .run();
  });
};

export const createMasterPlaylist = (outputFolder, inputHeight) => {
  console.log(`📝 Generating Master Playlist for max height: ${inputHeight}p`);

  let masterContent = `#EXTM3U\n#EXT-X-VERSION:3\n`;

  masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360\n360p/playlist.m3u8\n`;

  if (inputHeight >= 720) {
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p/playlist.m3u8\n`;
  }

  if (inputHeight >= 1080) {
    masterContent += `#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080\n1080p/playlist.m3u8\n`;
  }

  fs.writeFileSync(path.join(outputFolder, "master.m3u8"), masterContent);
};
