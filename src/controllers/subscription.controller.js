// controllers/subscription.controller.js
import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { Subscription } from "../models/subscription.model.js";
import mongoose from "mongoose";

// 📌 Subscribe to a channel
const subscribe = asynchandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    if (channelId.toString() === userId.toString()) {
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    const existing = await Subscription.findOne({
        subscriber: userId,
        channel: channelId,
    });

    if (existing) {
        throw new ApiError(400, "Already subscribed to this channel");
    }

    const subscription = await Subscription.create({
        subscriber: userId,
        channel: channelId,
    });

    return res
        .status(201)
        .json(new ApiResponse(201, subscription, "Subscribed successfully"));
});

// 📌 Unsubscribe from a channel
const unsubscribe = asynchandler(async (req, res) => {
    const { channelId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const subscription = await Subscription.findOneAndDelete({
        subscriber: userId,
        channel: channelId,
    });

    if (!subscription) {
        throw new ApiError(404, "You are not subscribed to this channel");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Unsubscribed successfully"));
});

// 📌 Get all subscribers of a channel
const getSubscribers = asynchandler(async (req, res) => {
    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid channel id");
    }

    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "username avatar fullname");

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});

// 📌 Get all channels a user is subscribed to
const getSubscribedChannels = asynchandler(async (req, res) => {
    const userId = req.user._id;

    const channels = await Subscription.find({ subscriber: userId })
        .populate("channel", "username avatar fullname");

    return res
        .status(200)
        .json(new ApiResponse(200, channels, "Subscribed channels fetched successfully"));
});

export {
    subscribe,
    unsubscribe,
    getSubscribers,
    getSubscribedChannels,
};
