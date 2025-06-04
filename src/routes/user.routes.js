import { Router } from 'express';
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getWatchHistory, loginUser, logoutUser, refreshAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([         //injected multer middleware to handle avatar and coverrImage file upload -- we call it just before registerUser 
        {
            name: "avatar",   // key="avatar" -- frontedn mai jo field banega uska naam bhi avatar hi hona chhaiye 
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser    // this middleware runs before this controller and stores uploaded files in temp folder
);

router.route("/login").post(loginUser);

//secured routes --- here i will need to use auth middleware 
router.route("/logout").post(verifyJWT, logoutUser);  // see why its imp to use nextt() in verifyJwt can be understood here as router after exectiong verifyJWT will know next() to execute and i.e here logoutUser
router.route("/refresh-token").post(refreshAccessToken); // here i did not needed req.user as all functinailty i worte in refreshAccessToken controller so as of here i dont need that middleware 
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)

router.route("/avatar").patch(verifyJWT,upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage)

router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory)

export default router;