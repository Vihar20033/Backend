import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {

    //TODO: create tweet
    const { content } = req.body

    if (!content || content.trim() === '') {
        throw new ApiError(400, 'Content is required')
    }

    if(content.length > 280) {
        throw new ApiError(400, 'Content exceeds the maximum length of 280 characters')
    }

    const tweet = new Tweet({
        content,
        postedBy: req.user._id
    })

    await tweet.save()

    res.status(201).json(new ApiResponse(true, 'Tweet created successfully', tweet))
})

const getUserTweets = asyncHandler(async (req, res) => {

    // TODO: get user tweets
    const userId = req.user._id

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, 'Invalid userId')
    }   

    const tweets = await Tweet.find({ postedBy: userId }).sort({ createdAt: -1 })
    res.status(200).json(new ApiResponse(true, 'User tweets fetched successfully', tweets))
})

const updateTweet = asyncHandler(async (req, res) => {

    //TODO: update tweet
    const tweetId = req.params.id
    const { content } = req.body
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, 'Invalid tweetId')
    }

    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found')
    }

    if (tweet.postedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to update this tweet')
    }
    if (content) {
        if(content.length > 280) {
            throw new ApiError(400, 'Content exceeds the maximum length of 280 characters')
        }       
        tweet.content = content
        await tweet.save()
    }       
    res.status(200).json(new ApiResponse(true, 'Tweet updated successfully', tweet))
})

const deleteTweet = asyncHandler(async (req, res) => {
    
    //TODO: delete tweet
    const tweetId = req.params.id
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, 'Invalid tweetId')
    }
    const tweet = await Tweet.findById(tweetId)
    if (!tweet) {
        throw new ApiError(404, 'Tweet not found')
    }   
    if (tweet.postedBy.toString() !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to delete this tweet')
    }
    await tweet.remove()
    res.status(200).json(new ApiResponse(true, 'Tweet deleted successfully', null))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}