import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query

    //TODO: get all videos based on query, sort, pagination
    const filter = { isPublished: true }
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ]
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, 'Invalid userId')
        }
        const user = await User.findById(userId)
        if (!user) {
            throw new ApiError(404, 'User not found')
        }
        filter.uploadedBy = userId
    }

    const sortOptions = {}
    if (sortBy) {
        const sortField = sortBy
        const sortOrder = sortType === 'desc' ? -1 : 1
        sortOptions[sortField] = sortOrder
    } else {
        sortOptions.createdAt = -1 // Default sorting by createdAt descending
    }

    const videos = await Video.find(filter)
        .sort(sortOptions)
        .skip((page - 1) * limit)
        .limit(parseInt(limit)) 
        .populate('uploadedBy', 'name email')
    const total = await Video.countDocuments(filter)

    res.status(200).json(new ApiResponse(true, 'Videos fetched successfully', {
        videos,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
    }))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    // TODO: get video, upload to cloudinary, create video
    if (!req.file) {
        throw new ApiError(400, 'Video file is required')
    }

    if (!title) {
        throw new ApiError(400, 'Video title is required')
    }

    if (!description) {
        throw new ApiError(400, 'Video description is required')
    }

    const result = await uploadOnCloudinary(req.file.path, 'videos')

    const video = await Video.create({
        title,
        description,
        videoUrl: result.secure_url,
        videoPublicId: result.public_id,
        uploadedBy: req.user._id,
        isPublished: true
    })

    res.status(201).json(new ApiResponse(true, 'Video published successfully', video))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId')
    }   

    const video = await Video.findById(videoId).populate('uploadedBy', 'name email')
    if (!video) {
        throw new ApiError(404, 'Video not found')
    }

    res.status(200).json(new ApiResponse(true, 'Video fetched successfully', video))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //TODO: update video details like title, description, thumbnail
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId')
    }
    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, 'Video not found')
    }   

    const { title, description } = req.body

        if (title) video.title = title
        if (description) video.description = description    
    await video.save()

    res.status(200).json(new ApiResponse(true, 'Video updated successfully', video))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId')
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, 'Video not found')
    }   

    await video.remove()

    res.status(200).json(new ApiResponse(true, 'Video deleted successfully', null))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, 'Invalid videoId')
    }

    const video = await Video.findById(videoId)
    if (!video) {
        throw new ApiError(404, 'Video not found')
    }

    video.isPublished = !video.isPublished
    await video.save()

    res.status(200).json(new ApiResponse(true, 'Video publish status updated successfully', video))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}