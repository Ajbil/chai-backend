import { Router } from 'express';
import { registerUser } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js'

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



export default router;