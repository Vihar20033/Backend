import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    //TODO: create playlist
    const newPlaylist = new Playlist({  
        name,
        description,
        user: req.user._id,
        videos: []
    })
    await newPlaylist.save()
    res.status(201).json(new ApiResponse(true, 'Playlist created successfully', newPlaylist))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid userId')
    }
    if (userId !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to view these playlists')
    }
    const playlists = await Playlist.find({ user: userId })
    res.status(200).json(new ApiResponse(true, 'User playlists fetched successfully', playlists))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, 'Invalid playlistId')
    }
    const playlist = await Playlist.findById(playlistId).populate('videos')
    if (!playlist) {
        throw new ApiError(404, 'Playlist not found')
    }   
    if (playlist.user.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to view this playlist')
    }
    res.status(200).json(new ApiResponse(true, 'Playlist fetched successfully', playlist))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}