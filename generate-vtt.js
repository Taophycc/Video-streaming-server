import { execSync } from "child_process";
import fs from "fs";

const videoFile = "storage/video.mp4";
const interval = 10;
const cols = 16;

// Get duration automatically
const duration = parseFloat(
  execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ${videoFile}`
  ).toString()
);

let vtt = "WEBVTT\n\n";
const totalThumbnails = Math.floor(duration / interval);

for (let i = 0; i < totalThumbnails; i++) {
  let startSec = i * interval;
  let endSec = (i + 1) * interval;

  let start = new Date(startSec * 1000).toISOString().substr(11, 12);
  let end = new Date(endSec * 1000).toISOString().substr(11, 12);

  let x = (i % cols) * 160;
  let y = Math.floor(i / cols) * 90;

  vtt += `${start} --> ${end}\nthumbnails.jpg#xywh=${x},${y},160,90\n\n`;
}

fs.writeFileSync("storage/hls/metadata.vtt", vtt);
console.log("Sync Complete! VTT matches the 16x15 Sprite Sheet.");
