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
──────────────────────────────── */

app.post("/process-video", async (req, res) => {
  let fileName: string;

  try {
    // Pub/Sub message format
    const message = Buffer.from(
      req.body.message.data,
      "base64"
    ).toString("utf-8");

    const payload = JSON.parse(message);

    if (!payload.name) {
      throw new Error("Filename missing in Pub/Sub payload");
    }

    fileName = payload.name;
  } catch (err) {
    console.error("❌ Invalid Pub/Sub message", err);
    return res.status(400).send("Invalid Pub/Sub payload");
  }

  console.log(`📥 Processing video: ${fileName}`);

  try {
    // 1️⃣ Download
    await downloadRawVideo(fileName);

    const resolutions: VideoResolution[] = ["360p", "720p"];

    // 2️⃣ Convert + Upload
    for (const reso of resolutions) {
      console.log(`🎬 Processing ${reso}`);

      await convertVideo(fileName, fileName, reso);
      await uploadProcessedVideo(fileName, reso);
      await deleteProcessedVideo(fileName, reso);
    }

    // 3️⃣ Cleanup raw file
    await deleteRawVideo(fileName);

    console.log(`✅ Processing completed: ${fileName}`);
    return res.status(200).send("Processing successful");
  } catch (err) {
    console.error("❌ Processing failed", err);
    await deleteRawVideo(fileName);
    return res.status(500).send("Processing failed");
  }
});

/* ────────────────────────────────
   SERVER
──────────────────────────────── */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Video processor running on port ${PORT}`);
});
app.get("/", (req, res) => {
  res.send("Video processing service is running");
});
