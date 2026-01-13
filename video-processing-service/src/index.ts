import express from "express";

import {
  setupDirectories,
  downloadRawVideo,
  convertVideo,
  uploadProcessedVideo,
  deleteRawVideo,
  deleteProcessedVideo,
  VideoResolution,
} from "./storage";

/* ────────────────────────────────
   SETUP
──────────────────────────────── */

setupDirectories();

const app = express();
app.use(express.json());

/* ────────────────────────────────
   VIDEO PROCESSING ENDPOINT
   (Triggered by Cloud Pub/Sub)
──────────────────────────────── */

app.post("/process-video", async (req, res) => {
  let fileName: string;

  // 1️⃣ Parse Pub/Sub message
  try {
    const message = Buffer.from(
      req.body.message.data,
      "base64"
    ).toString("utf8");

    const data = JSON.parse(message);

    if (!data.name) {
      throw new Error("Missing filename in Pub/Sub payload");
    }

    fileName = data.name;
  } catch (err) {
    console.error("❌ Invalid Pub/Sub message", err);
    return res.status(400).send("Bad Request");
  }

  console.log(`📥 Processing video: ${fileName}`);

  // 2️⃣ Download raw video
  try {
    await downloadRawVideo(fileName);
  } catch (err) {
    console.error("❌ Failed to download raw video", err);
    return res.status(500).send("Download failed");
  }

  const resolutions: VideoResolution[] = ["360p", "720p"];

  // 3️⃣ Convert + upload for each resolution
  try {
    for (const reso of resolutions) {
      console.log(`🎬 Converting to ${reso}`);

      await convertVideo(fileName, fileName, reso);
      await uploadProcessedVideo(fileName, reso);

      await deleteProcessedVideo(fileName, reso);
    }
  } catch (err) {
    console.error("❌ Video processing failed", err);

    // Cleanup on failure
    await deleteRawVideo(fileName);
    return res.status(500).send("Processing failed");
  }

  // 4️⃣ Cleanup raw file
  await deleteRawVideo(fileName);

  console.log(`✅ Processing completed: ${fileName}`);
  return res.status(200).send("Processing finished successfully");
});

/* ────────────────────────────────
   SERVER
──────────────────────────────── */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Video processor running on port ${PORT}`);
});
