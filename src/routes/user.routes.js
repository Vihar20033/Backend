import { Router } from "express"
import { registerUser, 
    loginUser , 
    loggedOutUser , 
    refreshAccessToken, 
    changeCurrentPassword, 
    UpdateAccountDetails, 
    updateUserAvatar, 
    updateUserCoverImage, 
    getUserChannelProfile, 
    addVideoToWatchHistory, 
    getCurrentUser,
    getWatchHistory, 
    removeVideoFromWatchHistory
} from "../controllers/user.controller.js"
import { upload } from "../middlewares/multer.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"



const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1   
        }
    ]),
    registerUser)

router.route("/login").post(loginUser)

// Secured Route
router.route("/logout").post(verifyJWT , loggedOutUser)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(verifyJWT , changeCurrentPassword)
router.route("/current-user").get(verifyJWT , getCurrentUser)
router.route("/update-account").patch(verifyJWT , UpdateAccountDetails)

router.route("/avatar").patch(verifyJWT , upload.single("avatar") , updateUserAvatar)
router.route("/cover-image").patch(verifyJWT , upload.single("coverImage") , updateUserCoverImage)

// From params
router.route("/c/:username").get(verifyJWT , getUserChannelProfile)
router.route("/history").get(verifyJWT , getWatchHistory)
router.route("/history/:videoId").post(verifyJWT , addVideoToWatchHistory)
router.route("/history/:videoId").delete(verifyJWT , removeVideoFromWatchHistory)




export default router
