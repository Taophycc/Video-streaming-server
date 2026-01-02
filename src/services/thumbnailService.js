import fs from "fs";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

export const generateThumbnailVTT = async (outputFolder, duration) => {
  const vttPath = path.join(outputFolder, "metadata.vtt");
  const interval = 10;
  const cols = 16;

  console.log(" Generating Thumbnail Metadata...");

  try {
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

    fs.writeFileSync(vttPath, vtt);
    console.log("✅ Thumbnail VTT Generated!");
  } catch (error) {
    console.error("❌ Error generating Thumbnail VTT:", error);
    throw error;
  }
};
