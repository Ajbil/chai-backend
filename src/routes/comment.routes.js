import express from 'express';
import { addComment, deleteComment, getVideoComments, updateComment } from '../controllers/comment.controller.js';
import { Router } from 'express';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();

router.use(verifyJWT, upload.none()); // Apply 2 middlewares  JWT verification and multer middleware to all routes in this router
//upload.none() -- used for extra safety it means:
//Expect no files in the request.
//Only accept text fields (e.g., content of a comment).
//If a file is sent, it throws an error.

router.route("/:videoId").get(getVideoComments).post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);

export default router;