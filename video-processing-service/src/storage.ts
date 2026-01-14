import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

/* ────────────────────────────────
   CONFIG
──────────────────────────────── */

const storage = new Storage();

const RAW_BUCKET = "ytclone-abhi-raw-videos";
const PROCESSED_BUCKET = "ytclone-abhi-processed-videos";

// ⚠️ ONLY writable location in Cloud Run
const RAW_DIR = "/tmp/raw-videos";
const PROCESSED_DIR = "/tmp/processed-videos";

export const VIDEO_RESOLUTIONS = {
  "360p": 360,
  "720p": 720,
} as const;

export type VideoResolution = keyof typeof VIDEO_RESOLUTIONS;

/* ────────────────────────────────
   SETUP
──────────────────────────────── */

export function setupDirectories() {
  ensureDir(RAW_DIR);

  for (const res of Object.keys(VIDEO_RESOLUTIONS)) {
    ensureDir(`${PROCESSED_DIR}/${res}`);
  }
}

/* ────────────────────────────────
   DOWNLOAD
──────────────────────────────── */

export async function downloadRawVideo(fileName: string) {
  const destination = `${RAW_DIR}/${fileName}`;

  await storage
    .bucket(RAW_BUCKET)
    .file(fileName)
    .download({ destination });

  console.log(`⬇️ Downloaded raw video → ${destination}`);
}

/* ────────────────────────────────
   CONVERT
──────────────────────────────── */

export function convertVideo(
  rawVideoName: string,
  processedVideoName: string,
  resolution: VideoResolution
) {
  const height = VIDEO_RESOLUTIONS[resolution];

  const inputPath = `${RAW_DIR}/${rawVideoName}`;
  const outputPath = `${PROCESSED_DIR}/${resolution}/${processedVideoName}`;

  return new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions("-vf", `scale=-2:${height}`)
      .on("start", (cmd) => {
        console.log(`🎞️ FFmpeg started: ${cmd}`);
      })
      .on("end", () => {
        console.log(`✅ Converted → ${resolution}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error", err);
        reject(err);
      })
      .save(outputPath);
  });
}

/* ────────────────────────────────
   UPLOAD
──────────────────────────────── */

export async function uploadProcessedVideo(
  fileName: string,
  resolution: VideoResolution
) {
  const localPath = `${PROCESSED_DIR}/${resolution}/${fileName}`;
  const destination = `${resolution}/${fileName}`;

  await storage
    .bucket(PROCESSED_BUCKET)
    .upload(localPath, { destination });

  console.log(`⬆️ Uploaded → gs://${PROCESSED_BUCKET}/${destination}`);
}

/* ────────────────────────────────
   CLEANUP
──────────────────────────────── */

export function deleteRawVideo(fileName: string) {
  return deleteFile(`${RAW_DIR}/${fileName}`);
}

export function deleteProcessedVideo(
  fileName: string,
  resolution: VideoResolution
) {
  return deleteFile(`${PROCESSED_DIR}/${resolution}/${fileName}`);
}

/* ────────────────────────────────
   UTILS
──────────────────────────────── */

function deleteFile(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(path)) return resolve();

    fs.unlink(path, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
}
