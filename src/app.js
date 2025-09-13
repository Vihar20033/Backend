import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// CORS is a gatekeeper that decides which websites can access your backend API.
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));


// Middleware that parse incoming JSON requests
app.use(express.json({
    limit: "16kb"
}));

//Middleware to handle form data 
app.use(express.urlencoded({ 
    extended: true,
    limit: "16kb"
})) 

// middleware serves static files directly from a folder in your project.
app.use(express.static("public"))

// Middleware that parses cookies attached to the client request object.    
app.use(cookieParser());

import userRouter from './routes/user.routes.js'
import healthCheckRouter from "./routes/healthCheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

//routes declaration
app.use("/api/v1/healthCheck", healthCheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)


export { app };