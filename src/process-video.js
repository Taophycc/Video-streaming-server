import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pipeline } from "@xenova/transformers";
import wavefile from "wavefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, "../storage/video.mp4");
const hlsFolder = path.join(__dirname, "../storage/hls");
const tempAudioFile = path.join(__dirname, "../storage/temp_audio.wav");

// Convert Seconds to VTT Format ---
const toVTTTime = (seconds) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  const substr = date.toISOString().substr(11, 8);
  const ms = (seconds % 1).toFixed(3).substring(2);
  return `${substr}.${ms}`;
};

// Extract Audio from Video ---
const extractAudio = () => {
  return new Promise((resolve, reject) => {
    console.log("🔊 Extracting audio track...");
    ffmpeg(inputFile)
      .toFormat("wav")
      .audioChannels(1)
      .audioFrequency(16000)
      .save(tempAudioFile)
      .on("end", () => resolve())
      .on("error", (err) => reject(err));
  });
};

// AI Subtitle Generator ---
const generateSubtitles = async () => {
  // 1. Extract audio first
  await extractAudio();

  console.log("🤖 AI is listening...");

  // Read the raw audio data
  const buffer = fs.readFileSync(tempAudioFile);
  const wav = new wavefile.WaveFile(buffer);
  wav.toBitDepth("32f"); // Convert to float32 (AI format)
  const audioData = wav.getSamples(false, Float32Array);

  // Load Model
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny.en"
  );

  // Transcribe raw audio
  const output = await transcriber(audioData, {
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: true,
  });

  // Convert to VTT
  let vttContent = "WEBVTT\n\n";
  output.chunks.forEach((chunk) => {
    const start = toVTTTime(chunk.timestamp[0]);
    const end = toVTTTime(chunk.timestamp[1]);
    vttContent += `${start} --> ${end}\n${chunk.text.trim()}\n\n`;
  });

  // Save & Cleanup
  fs.writeFileSync(path.join(hlsFolder, "subtitles.vtt"), vttContent);
  fs.unlinkSync(tempAudioFile);
  console.log("✅ AI Subtitles generated: subtitles.vtt");
};

// Video Transcoder ---
const transcode = (resolution, outputName, bitrate) => {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${resolution} chop...`);
    const variantFolder = path.join(hlsFolder, outputName);
    fs.mkdirSync(variantFolder);

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

const createMasterPlaylist = () => {
  const masterContent = `
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=800000,RESOLUTION=640x360
360p/playlist.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720
720p/playlist.m3u8
  `.trim();

  fs.writeFileSync(path.join(hlsFolder, "master.m3u8"), masterContent);
};

const main = async () => {
  try {
    if (fs.existsSync(hlsFolder))
      fs.rmSync(hlsFolder, { recursive: true, force: true });
    fs.mkdirSync(hlsFolder);

    console.log("🎬 Starting Video Pipeline...");

    await generateSubtitles();
    await transcode("640x360", "360p", "800k");
    await transcode("1280x720", "720p", "2500k");
    createMasterPlaylist();

    console.log("✅ ALL DONE!");
  } catch (err) {
    console.error("Error:", err);
  }
};

main();
