import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    const filter = { isPublished: true }

    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } }
        ]
    }

    if (userId) {
        if (!isValidObjectId(userId)) throw new ApiError(400, "Invalid userId")
        const user = await User.findById(userId)
        if (!user) throw new ApiError(404, "User not found")
        filter.owner = userId
    }

    const sortOptions = {}
    if (sortBy) sortOptions[sortBy] = sortType === "desc" ? -1 : 1
    else sortOptions.createdAt = -1

    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "name email")

    const total = await Video.countDocuments(filter)

    res.status(200).json(new ApiResponse(true, "Videos fetched", {
        videos,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
    }))
})

const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body

    if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
        throw new ApiError(400, "Video and thumbnail required")
    }

    if (!title || !description) {
         throw new ApiError(400, "Title and description required")
    }
       
    const videoResult = await uploadOnCloudinary(req.files.videoFile[0].path, "video")
    const thumbnailResult = await uploadOnCloudinary(req.files.thumbnail[0].path, "image")

    const video = await Video.create({
        title,
        description,
        videoFile: videoResult.secure_url,
        thumbnail: thumbnailResult.secure_url,
        duration: videoResult.duration,
        owner: req.user._id,
        isPublished: true
    })

    res.status(201).json(new ApiResponse(true, "Video published", video))
})

const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId).populate("owner", "name email")

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    video.views += 1
    await video.save()

    res.status(200).json(new ApiResponse(true, "Video fetched", video))
})

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    const { title, description } = req.body

    if (title) {
        video.title = title
    }

    if (description) {
        video.description = description
    }

    if (req.file) {
        const thumbResult = await uploadOnCloudinary(req.file.path, "image")
        video.thumbnail = thumbResult.secure_url
    }

    await video.save()
    res.status(200).json(new ApiResponse(true, "Video updated", video))
})

const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.videoFile) {
        await deleteFromCloudinary(video.videoFile, "video")
    }

    if (video.thumbnail) {
        await deleteFromCloudinary(video.thumbnail, "image")
    }

    await video.remove()
    res.status(200).json(new ApiResponse(true, "Video deleted", null))

})

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    video.isPublished = !video.isPublished
    await video.save()

    res.status(200).json(new ApiResponse(true, "Publish status updated", video))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
