import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiresponse.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

/**
 * generateAccessAndRefreshToken
 * - Assumes User model instance has generateAccessToken() and generateRefreshToken()
 */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found while generating tokens");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Store refresh token in db (skip validations)
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

/* ========================= REGISTER ========================= */
const registerUser = asynchandler(async (req, res) => {
  const { fullname, email, username, password } = req.body;

  // Validation
  if ([fullname, email, username, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // Check existing user by username or email
  const existedUser = await User.findOne({
    $or: [{ username: username?.toLowerCase() }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  // Files (multer) handling
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  let coverImageLocalPath;
  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // Uploads to Cloudinary (cover image optional)
  const avatarUpload = await uploadToCloudinary(avatarLocalPath);
  const coverUpload = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath) : null;

  if (!avatarUpload?.url) {
    throw new ApiError(500, "Error uploading avatar");
  }

  // Create user
  const user = await User.create({
    fullname,
    avatar: avatarUpload.url,
    coverImage: coverUpload?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // Fetch created user without sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res.status(201).json(new ApiResponse(201, createdUser, "User Registered Successfully"));
});

/* ========================= LOGIN ========================= */
const loginUser = asynchandler(async (req, res) => {
  const { email, username, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username: username?.toLowerCase() }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Check password - ensure method exists
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Generate tokens and store refreshToken
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  // Response user payload
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  console.log(`✅ User logged in successfully: ${loggedInUser?.username} (${loggedInUser?.email})`);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in Successfully")
    );
});

/* ========================= LOGOUT ========================= */
const loggedOutUser = asynchandler(async (req, res) => {
  // Remove refresh token from DB (if user exists)
  if (req.user?._id) {
    await User.findByIdAndUpdate(
      req.user._id,
      { $set: { refreshToken: undefined } },
      { new: true }
    );
  }

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  console.log(`🚪 User logged out: ${req.user?.username} (${req.user?.email})`);

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully"));
});

/* ========================= REFRESH ACCESS TOKEN ========================= */
const refreshAccessToken = asynchandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or invalid");
    }

    const cookieOptions = { httpOnly: true, secure: true, sameSite: "None" };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access Token Refreshed Successfully"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

/* ========================= CHANGE CURRENT PASSWORD ========================= */
const changeCurrentPassword = asynchandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new passwords are required");
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, "User not found");

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

/* ========================= GET CURRENT USER ========================= */
const getCurrentUser = asynchandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

/* ========================= UPDATE ACCOUNT DETAILS ========================= */
const UpdateAccountDetails = asynchandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { fullname, email } },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

/* ========================= UPDATE AVATAR ========================= */
const updateUserAvatar = asynchandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  // Delete old avatar from Cloudinary (if exists)
  if (user.avatar) {
    try {
      const segments = user.avatar.split("/");
      const last = segments[segments.length - 1];
      const publicId = last.split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Error deleting old avatar:", error);
    }
  }

  // Upload new avatar and update
  const uploaded = await uploadToCloudinary(avatarLocalPath);
  if (!uploaded?.url) throw new ApiError(500, "Error while uploading avatar");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { avatar: uploaded.url } },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

/* ========================= UPDATE COVER IMAGE ========================= */
const updateUserCoverImage = asynchandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) throw new ApiError(400, "Cover image file is missing");

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.coverImage) {
    try {
      const segments = user.coverImage.split("/");
      const last = segments[segments.length - 1];
      const publicId = last.split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error("Error deleting old cover image:", error);
    }
  }

  const uploaded = await uploadToCloudinary(coverImageLocalPath);
  if (!uploaded?.url) throw new ApiError(500, "Error while uploading cover image");

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: { coverImage: uploaded.url } },
    { new: true }
  ).select("-password");

  return res.status(200).json(new ApiResponse(200, updatedUser, "Cover image updated successfully"));
});

/* ========================= GET USER CHANNEL PROFILE (aggregation) ========================= */
const getUserChannelProfile = asynchandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) throw new ApiError(400, "Username is not found");

  // Aggregation pipeline
  const channelArr = await User.aggregate([
    { $match: { username: username.toLowerCase() } },

    // Lookup subscribers (documents from subscriptions collection where channel == this user _id)
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    // Lookup subscriptions where this user is a subscriber (i.e. channels they subscribed to)
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },

    // Project fields we need and counts
    {
      $project: {
        fullname: 1,
        username: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
        subscribersCount: { $size: "$subscribers" },
        subscriptionsCount: { $size: "$subscribedTo" },
        subscribers: 1,
      },
    },
  ]);

  if (!channelArr || channelArr.length === 0) {
    throw new ApiError(404, "Channel not found");
  }

  const channel = channelArr[0];

  // Compute isSubscribed server-side (safer & simpler)
  let isSubscribed = false;
  try {
    if (req.user?._id) {
      const curIdStr = req.user._id.toString();
      isSubscribed = Array.isArray(channel.subscribers) && channel.subscribers.some((s) => {
        // subscription doc could be like { subscriber: ObjectId, channel: ObjectId, ...}
        const subscriberId = s?.subscriber?.toString ? s.subscriber.toString() : null;
        return subscriberId === curIdStr;
      });
    }
  } catch (err) {
    isSubscribed = false;
  }

  const result = {
    fullname: channel.fullname,
    username: channel.username,
    avatar: channel.avatar,
    coverImage: channel.coverImage,
    email: channel.email,
    subscribersCount: channel.subscribersCount,
    subscriptionsCount: channel.subscriptionsCount,
    isSubscribed,
  };

  return res.status(200).json(new ApiResponse(200, result, "User channel profile fetched successfully"));
});

/* ========================= GET WATCH HISTORY (aggregation) ========================= */
const getWatchHistory = asynchandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const userAgg = await User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
    {
      $project: {
        watchHistory: 1,
      },
    },
  ]);

  const history = (userAgg && userAgg[0] && userAgg[0].watchHistory) || [];
  return res.status(200).json(new ApiResponse(200, history, "User watch history fetched successfully"));
});

/* ========================= REMOVE VIDEO FROM WATCH HISTORY ========================= */
const removeVideoFromWatchHistory = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  user.watchHistory.pull(videoId);
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user.watchHistory, "Video removed from watch history successfully"));
});

/* ========================= ADD VIDEO TO WATCH HISTORY ========================= */
const addVideoToWatchHistory = asynchandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid video id");

  const user = await User.findById(req.user?._id);
  if (!user) throw new ApiError(404, "User not found");

  // Avoid duplicates
  if (!user.watchHistory.map(String).includes(String(videoId))) {
    user.watchHistory.push(videoId);
    await user.save();
  }

  return res.status(200).json(new ApiResponse(200, user.watchHistory, "Video added to watch history successfully"));
});

export {
  registerUser,
  loginUser,
  loggedOutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  UpdateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  removeVideoFromWatchHistory,
  addVideoToWatchHistory,
};
