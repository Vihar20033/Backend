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

// routes import 
import userRouter from "./routes/user.routes.js";

// Routes declaration -> http://localhost:8000/api/v1/users/register
app.use("/api/v1/users", userRouter)

export { app };