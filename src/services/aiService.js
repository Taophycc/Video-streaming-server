import fs from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { pipeline } from "@xenova/transformers";
import wavefile from "wavefile";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toVTTTime = (seconds) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const substr = date.toISOString().substr(11, 8);
  const ms = (seconds % 1).toFixed(3).substring(2);
  return `${substr}.${ms}`;
};

const extractAudio = (inputFile, tempAudioFile) => {
  return new Promise((resolve, reject) => {
    console.log(" Extracting audio track...");
    ffmpeg(inputFile)
      .toFormat("wav")
      .audioChannels(1)
      .audioFrequency(16000)
      .save(tempAudioFile)
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
};

export const generateSubtitles = async (inputFile, outputFolder) => {
  const tempAudioFile = path.join(outputFolder, "temp_audio.wav");

  try {
    await extractAudio(inputFile, tempAudioFile);

    console.log(" AI is listening...");

    const buffer = fs.readFileSync(tempAudioFile);
    const wav = new wavefile.WaveFile(buffer);
    wav.toBitDepth("32f");
    const audioData = wav.getSamples(false, Float32Array);

    const transcriber = await pipeline(
      "automatic-speech-recognition",
      "Xenova/whisper-tiny.en"
    );

    const output = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });

    let vttContent = "WEBVTT\n\n";
    output.chunks.forEach((chunk) => {
      const start = toVTTTime(chunk.timestamp[0]);
      const end = toVTTTime(chunk.timestamp[1]);
      vttContent += `${start} --> ${end}\n${chunk.text.trim()}\n\n`;
    });

    fs.writeFileSync(path.join(outputFolder, "subtitles.vtt"), vttContent);
    console.log("✅ AI Subtitles generated: subtitles.vtt");
  } finally {
    if (fs.existsSync(tempAudioFile)) fs.unlinkSync(tempAudioFile);
  }
};
