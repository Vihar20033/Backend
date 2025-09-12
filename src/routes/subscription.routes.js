import express from "express";
import {
    subscribe,
    unsubscribe,
    getSubscribers,
    getSubscribedChannels,
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Subscribe to a channel
router.post("/:channelId", verifyJWT, subscribe);

// Unsubscribe from a channel
router.delete("/:channelId", verifyJWT, unsubscribe);

// Get all subscribers of a channel
router.get("/:channelId/subscribers", getSubscribers);

// Get all channels the logged-in user is subscribed to
router.get("/me/channels", verifyJWT, getSubscribedChannels);

export default router;
