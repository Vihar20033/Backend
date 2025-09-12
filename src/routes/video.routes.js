import { Router } from "express"
import { upload } from "../middlewares/multer.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import {
    uploadVideo,
    getAllVideos,
    getVideoById,
    toggleLikeVideo,
    addComment,
    deleteVideo,
    addVideoToWatchHistory,
} from "../controllers/video.controller.js";

// routes/video.routes.js
import express from "express";
import {
    uploadVideo,
    getAllVideos,
    getVideoById,
    toggleLikeVideo,
    addComment,
    deleteVideo,
    addVideoToWatchHistory,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js"; // for handling video + thumbnail upload


const router = Router()

// Upload new video (requires video + thumbnail)
router.post(
    "/upload",
    verifyJWT,
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    uploadVideo
);

// Get all videos (homepage feed)
router.get("/", getAllVideos);

// Get single video details
router.get("/:videoId", getVideoById);

// Like / Unlike video
router.post("/:videoId/like", verifyJWT, toggleLikeVideo);

// Add comment to video
router.post("/:videoId/comment", verifyJWT, addComment);

// Delete video (only owner can delete)
router.delete("/:videoId", verifyJWT, deleteVideo);

// Add video to watch history
router.post("/:videoId/history", verifyJWT, addVideoToWatchHistory);

export default router;
