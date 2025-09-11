import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) =>
{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Store refresh token in db
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return { accessToken , refreshToken }

    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating tokens")
    }
}

const registerUser = asynchandler(async (req, res) => {
    // Get user details
    // Validate - not empty
    // Check if user already exists : username and email
    // Check for images and avatar
    // Upload them to cloudinary 
    // Create user object - create entry in db
    // Remove password and refresh tokens field from response
    // check for user creation
    // return response


    // Data comes from form and json get with req.body
    const {fullname , email , username , password}= req.body

    //Validation
    if([fullname , email , username , password].some(field => field?.trim() === "")){
        throw new ApiError(400 , "All fields are required")
    }

    // Checking existing user
    const existedUser = await User.findOne({
        $or: [ {username } , { email }]
    })

    if( existedUser){
        throw new ApiError(409 , "User already exists")
    }

    // Image and avatar - Stored in server not in cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path

    //const coverImageLocalPath = req.files?.coverImage[0]?.path => Give problem on undefined URL response
    // req.files are in array format with object inside it 
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
        
    }

    // Image and avatar - Stored in Cloudinary
    const avatar = await uploadToCloudinary(avatarLocalPath)
    const coverImage  = await uploadToCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar file is required");
    }

    // Create user Object and entry into Database
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    //Remove Password and refreshToken
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // Check User Creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    // Response
    return res.status(201).json(
        new ApiResponse(200, createdUser , "User Registered Successfully ")
    )


})

const loginUser = asynchandler (async (req , res) => {
    // data from req.body
    // username or email to get user
    // find the user in db
    // check for password
    // generate access token and refresh token
    // Send Cookie in response


    // Data from req.body
    const { email , username , password } = req.body
    if(!username && !email){
        throw new ApiError(400 , "Username or email is required")
    }

    // Find the user
    const user = await User.findOne({
    $or: [
      { username: username?.toLowerCase() },
      { email }
    ]
})

    if(!user){
        throw new ApiError(404 , "User not found")
    }

    // Check for password
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid password")
    }

    // Generate access token and refresh token
    const { accessToken , refreshToken } = await generateAccessAndRefreshToken(user._id)

    // Send cookie in response
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true,
    }
    // Response
    console.log(`✅ User logged in successfully: ${loggedInUser.username} (${loggedInUser.email})`);



    return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , refreshToken , options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser , accessToken , refreshToken
            },"User logged in Successfully")
        )
})

const loggedOutUser = asynchandler(async (req, res) => {
  // Remove refresh token from DB
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // ✅ Log to terminal
  console.log(`🚪 User logged out: ${req.user.username} (${req.user.email})`);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out Successfully.."));
});

const refreshAccessToken = asynchandler(async (req , res) => {
    // Get refresh token from cookie
    // Validate the token
    // Check if user exists
    // Check if token is in db
    // Generate new access token and refresh token
    // Store refresh token in db
    // Send cookie in response

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized Request")
    }

   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401 , "Invalid Refresh Token")
     }
 
     if(!incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(401 , "Refresh Token is Expired")
     }
 
     const options = {
         httpOnly: true,
         secure: true
     }
     
     const {accessToken , newRefreshToken} = await generateAccessAndRefreshToken(user._id)
 
     return res
     .status(200)
     .cookie("accessToken",accessToken, options)
     .cookie("NewrefreshToken",newRefreshToken , options)
     .json(
         new ApiResponse(
             200,
             {accessToken,newRefreshToken},
             "Access Token Refreshed Succesfully"
         )
     )
   } catch (error) {
        throw new ApiError (401,error?.message || "Invalid Refresh Token")
   }

})

const changeCurrentPassword = asynchandler(async (req , res) => {
    // Find user in db
    // Check for old password
    // Update with new password
    // Send response

    const {oldPassword , newPassword} = req.body

    // Finding user in db
    const user = await User.findById(req.user._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    // Validation
    if(!isPasswordCorrect){
        throw new ApiError(400 , "Old password is incorrect")
    }

    // Update with new password
    user.password = newPassword
    await user.save(validateBeforeSave = false)

    // Response
    return res.status(200).json(
        new ApiResponse(200, {} , "Password changed successfully")
    )
})

const getCurrentUser = asynchandler(async (req , res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user , "Current user fetched successfully")
    )
})

const UpdateAccountDetails = asynchandler(async (req , res) => {
    const {fullname , email } = req.body

    if(!fullname || !email){
        throw new ApiError(400,"All fields are required")
    }

    User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { fullname , email }
        },
        { new: true }
    ).select("-password")

    req.status(200).json(
        new ApiResponse(200, {} , "Account details updated successfully")
    )
}) 

const updateUserAvatar = asynchandler(async (req, res) => {
    // Get uploaded file path (multer stores in req.file)
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // Find user
    const user = await User.findById(req.user?._id);

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete old avatar from Cloudinary (if exists)
    if (user.avatar) {
        try {
            const publicId = user.avatar.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error("Error deleting old avatar:", error);
        }
    }

    // Upload new avatar
    const avatar = await uploadToCloudinary(avatarLocalPath);

    if (!avatar?.url) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    // Update user avatar
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});

const updateUserCoverImage = asynchandler(async (req, res) => {
    // Get uploaded file path
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    // Find user
    const user = await User.findById(req.user?._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Delete old cover image from Cloudinary if exists
    if (user.coverImage) {
        try {
            const publicId = user.coverImage.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error("Error deleting old cover image:", error);
        }
    }

    // Upload new cover image
    const coverImage = await uploadToCloudinary(coverImageLocalPath);

    if (!coverImage?.url) {
        throw new ApiError(500, "Error while uploading cover image");
    }

    // Update user with new cover image
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: { coverImage: coverImage.url }
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, updatedUser, "Cover image updated successfully"));
});

// MongoDB Aggregation to get user channel profile details
const getUserChannelProfile = asynchandler(async (req, res) => {

    const { username } = req.params
    if(!username?.trim()){
        throw new ApiError(400 , "Username is not found")
    }

    // Aggregation pipeline
    const channel = await User.aggregate([

        // Match user by username
        {
            $match: { username: username?.toLowerCase() }
        },

        // Lookup subscriptions where user is a channel
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },

        // Lookup subscriptions where user is a subscriber
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribed to"
            }
        },

        // Add pipeline to count subscribers and subscriptions and check if current user is subscribed
        {
            $addFields: {
                subcribersCount: { $size: "$subscribers" },
                subscriptionsCount: { $size: "$subscribed to"},
                isSubscribed: { $con:{
                    if: {$in: [req.user?._id , "$subscribers.subscriber"]},
                    then: true,
                    else: false
                } }
            }
        },

        // Project only necessary fields
        {
            $project: { 
                fullname: 1, 
                username: 1,  
                subcribersCount: 1, 
                subscriptionsCount: 1, 
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,  
            }
        },
     
    ])

    // Check if channel exists
    if(!channel || channel.length === 0){
        throw new ApiError(404 , "Channel not found")
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0] , "User channel profile fetched successfully")
    )
})



export {
    registerUser,
    loginUser , 
    loggedOutUser, 
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    UpdateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}
