import { Storage } from "@google-cloud/storage";
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

/* ────────────────────────────────
   CONFIG
──────────────────────────────── */

const storage = new Storage();

const RAW_BUCKET = "neetcode-yt-raw-videos";
const PROCESSED_BUCKET = "neetcode-yt-processed-videos";

const RAW_DIR = "./raw-videos";
const PROCESSED_DIR = "./processed-videos";

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
  await storage.bucket(RAW_BUCKET)
    .file(fileName)
    .download({
      destination: `${RAW_DIR}/${fileName}`,
    });

  console.log(`⬇️ Raw video downloaded: ${fileName}`);
}

/* ────────────────────────────────
   CONVERT (360p / 720p)
──────────────────────────────── */

export function convertVideo(
  rawVideoName: string,
  processedVideoName: string,
  resolution: VideoResolution
) {
  const height = VIDEO_RESOLUTIONS[resolution];

  return new Promise<void>((resolve, reject) => {
    ffmpeg(`${RAW_DIR}/${rawVideoName}`)
      .outputOptions("-vf", `scale=-2:${height}`)
      .on("end", () => {
        console.log(`✅ Converted ${rawVideoName} → ${resolution}`);
        resolve();
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
        reject(err);
      })
      .save(`${PROCESSED_DIR}/${resolution}/${processedVideoName}`);
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

  const bucket = storage.bucket(PROCESSED_BUCKET);

  await bucket.upload(localPath, { destination });
  await bucket.file(destination).makePublic();

  console.log(`⬆️ Uploaded: ${destination}`);
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
   INTERNAL UTILS
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
