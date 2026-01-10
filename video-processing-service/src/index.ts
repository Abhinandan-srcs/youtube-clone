import express, { Request, Response } from "express";
import ffmpeg from "fluent-ffmpeg";
import multer from "multer";
import path from "path";
import fs from "fs";

// 🔴 IMPORTANT: Explicit FFmpeg paths (WSL)
ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
ffmpeg.setFfprobePath("/usr/bin/ffprobe");

const app = express();

// --------------------
// Multer configuration
// --------------------
const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
});

// --------------------
// Video processing API
// --------------------
app.post(
  "/process-video",
  upload.single("video"),
  (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).send("No video file uploaded");
      }

      // Absolute directories
      const uploadsDir = path.join(process.cwd(), "uploads");
      const outputDir = path.join(process.cwd(), "outputs");

      // Ensure directories exist
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const inputFilePath = req.file.path;
      const output360Path = path.join(outputDir, "output_360p.mp4");
      const output720Path = path.join(outputDir, "output_720p.mp4");

      console.log("Input:", inputFilePath);
      console.log("360p Output:", output360Path);
      console.log("720p Output:", output720Path);

      // --------------------
      // 360p conversion
      // --------------------
      ffmpeg(inputFilePath)
        .outputOptions(["-vf", "scale=-2:360"])
        .on("start", (cmd) => {
          console.log("FFmpeg 360p command:", cmd);
        })
        .on("end", () => {
          console.log("360p done");

          // --------------------
          // 720p conversion
          // --------------------
          ffmpeg(inputFilePath)
            .outputOptions(["-vf", "scale=-2:720"])
            .on("start", (cmd) => {
              console.log("FFmpeg 720p command:", cmd);
            })
            .on("end", () => {
              console.log("720p done");
              res
                .status(200)
                .send("360p and 720p generated successfully");
            })
            .on("error", (err) => {
              console.error("720p error:", err.message);
              res.status(500).send(`720p error: ${err.message}`);
            })
            .save(output720Path);
        })
        .on("error", (err) => {
          console.error("360p error:", err.message);
          res.status(500).send(`360p error: ${err.message}`);
        })
        .save(output360Path);
    } catch (err: any) {
      console.error("Unexpected error:", err.message);
      res.status(500).send("Unexpected server error");
    }
  }
);

// --------------------
// Server start
// --------------------
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
