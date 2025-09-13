import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Invalid channelId')
    }

    if (channelId === req.user._id.toString()) {
        throw new ApiError(400, 'You cannot subscribe to yourself')
    }

    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, 'Channel not found')
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: channelId
    })

    if (existingSubscription) {
        // Unsubscribe
        await existingSubscription.remove()
        res.status(200).json(new ApiResponse(true, 'Unsubscribed successfully'))
    } else {
        // Subscribe
        const newSubscription = new Subscription({
            subscriber: req.user._id,
            channel: channelId
        })
        await newSubscription.save()

        res.status(201).json(new ApiResponse(true, 'Subscribed successfully', newSubscription))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, 'Invalid channelId')
    }
    const channel = await User.findById(channelId)
    if (!channel) {
        throw new ApiError(404, 'Channel not found')
    }
    const subscribers = await Subscription.find({ channel: channelId }).populate('subscriber', 'username email')
    res.status(200).json(new ApiResponse(true, 'Channel subscribers fetched successfully', subscribers))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, 'Invalid subscriberId')
    }   
    if (subscriberId !== req.user._id.toString()) {
        throw new ApiError(403, 'You are not authorized to view this subscriber list')
    }
    const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate('channel', 'username email')
    res.status(200).json(new ApiResponse(true, 'Subscribed channels fetched successfully', subscriptions))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}