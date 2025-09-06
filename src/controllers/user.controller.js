import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/apierror.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";

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
    console.log("email: " , email)

    //Validation
    if([fullname , email , username , password].some(field => field?.trim() === "")){
        throw new ApiError(400 , "All fields are required")
    }

    // Checking existing user
    const existedUser = User.findOne({
        $or: [ {username } , { email }]
    })

    if( existedUser){
        throw new ApiError(409 , "User already exists")
    }

    // Image and avatar - Stored in server not in cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path
    console.log("AvatarPath: ", avatarLocalPath)
    console.log("CoverImagePath: ", coverImageLocalPath)

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

export { registerUser }