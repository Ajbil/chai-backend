import { Router } from 'express';
import { loginUser, logoutUser, refreshAccessToken, registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

router.route("/register").post(
    upload.fields([         // multer middleware to handle avatar and coverrImage file upload -- we call it just before registerUser 
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
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshAccessToken);

export default router;