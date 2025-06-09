import {Router} from 'express';
import { verifyJWT } from '../middlewares/auth.middleware'; 
import { createTweet, deleteTweet, updateTweet, getUserTweets } from '../controllers/tweet.controller';

import { upload } from '../middlewares/multer.middleware';

const router = Router();


router.use(verifyJWT, upload.none());

router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router;