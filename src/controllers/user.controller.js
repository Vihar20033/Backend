import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiresponse.js";

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
    if(!username || !email){
        throw new ApiError(400 , "Username or email is required")
    }

    // Find the user
    const user = await User.findOne({
        $or: [{username} , {email}]
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

    return res
        .status(200)
        .cookie("accessToken" , accessToken , options)
        .cookie("refreshToken" , refreshToken , options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser , accessToken , refreshToken
            }), "User logged in Successfully"
        )
})

const loggedOutUser = asynchandler ( async(req , res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true 
        }
    )

        const options = {
            httpOnly : true,
            secure : true,
        }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200 , {}, "User Logged Out Successfully.."))

})

export { registerUser , loginUser , loggedOutUser }
