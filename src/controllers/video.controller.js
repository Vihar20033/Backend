import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import mongoose from "mongoose";

// 📌 Upload a new video
const uploadVideo = asynchandler(async (req, res) => {
    const { title, description } = req.body;
    const userId = req.user._id;

    if (!req.files || !req.files.video || !req.files.thumbnail) {
        throw new ApiError(400, "Video and thumbnail are required");
    }

    const videoFile = req.files.video[0].path;
    const thumbnailFile = req.files.thumbnail[0].path;

    const videoUrl = await uploadToCloudinary(videoFile, "videos");
    const thumbnailUrl = await uploadToCloudinary(thumbnailFile, "thumbnails");

    const video = await Video.create({
        title,
        description,
        videoUrl,
        thumbnailUrl,
        owner: userId,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, video, "Video uploaded successfully"));
});

// 📌 Get all videos (homepage feed)
const getAllVideos = asynchandler(async (req, res) => {
    const videos = await Video.find({})
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// 📌 Get single video details
const getVideoById = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId).populate("owner", "username avatar");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Increase view count
    video.views += 1;
    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video details fetched"));
});

// 📌 Like / Unlike a video
const toggleLikeVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const isLiked = video.likes.includes(userId);
    if (isLiked) {
        video.likes.pull(userId); // remove like
    } else {
        video.likes.push(userId); // add like
    }

    await video.save();

    return res
        .status(200)
        .json(new ApiResponse(200, video, isLiked ? "Like removed" : "Video liked"));
});

// 📌 Add comment to a video
const addComment = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment = {
        user: userId,
        text,
        createdAt: new Date(),
    };

    video.comments.push(comment);
    await video.save();

    return res
        .status(201)
        .json(new ApiResponse(201, video.comments, "Comment added successfully"));
});

// 📌 Delete a video (only owner can delete)
const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this video");
    }

    await video.deleteOne();

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// 📌 Add video to watch history
const addVideoToWatchHistory = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid video id");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    if (!user.watchHistory.includes(videoId)) {
        user.watchHistory.push(videoId);
        await user.save();
    }

    return res
        .status(200)
        .json(new ApiResponse(200, user.watchHistory, "Video added to history"));
});

export {
    uploadVideo,
    getAllVideos,
    getVideoById,
    toggleLikeVideo,
    addComment,
    deleteVideo,
    addVideoToWatchHistory,
};
