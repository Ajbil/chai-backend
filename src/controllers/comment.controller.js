import mongoose, {Schema} from 'mongoose';
import { Comment } from '../models/comment.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {Video} from '../models/video.model.js';
import { Like } from '../models/like.model.js';
import { fullList } from 'npm';
import { parse } from 'dotenv';

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO : get all comments for a video with pagination , comment datails, owner details, Like count pe comment  and wheather the cuurent user has liked a comment
    const {videoId} = req.params;
    const { page = 1, limit = 10 } = req.query; 

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    // Now here we will use aggregate paginate to get comments for a video with pagination
    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video : new mongoose.Types.ObjectId(videoId) // Match comments for the specific video
            }
        },
        {
            $lookup: { // Join with the User collection to get comment owner details for each comment
                from : "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {  // Join with the Like collection to get likes for each comment
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as:"likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                }, // Add a field for the count of likes
                owner: {
                    $first: "$owner"   // Since $lookup we did on users returns an array always(even if its one user), we use $first to get the first element which is the owner details.
                },
                isLiked: { //Checks if the current logged-in user has liked this comment.
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1 // Sort comments by creation date in descending order -newest first
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner :{
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                },
                isLiked: 1
            }
        }
    ]);

    //pagination Splits results into pages, avoids over-fetching.
    const options = {
        page: pareseInt(page,10),  //Converts the page query param (which is a string from the URL) into a number. e.g., '2' → 2  -- example url /api/v1/videos/123/comments?page=2&limit=10
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate, 
        options
    );

    return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    //TODO : adda comment to a video 
    const {videoId} = req.params;
    const {content} = req.body;

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content is required for comment");
    }

    const video = await Video.findById(videoId);
    if(!video) {
        throw new ApiError(404, "Video not found");
    }

    const comment  = await Comment.create({
        content,
        video : videoId,
        owner: req.user?._id
    });

    if(!comment) {
        throw new ApiError(500, "Failed to add comment");
    }

    return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully!"));
});

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const { commentId } = req.params;
    const {content} = req.body;

    if(!content || content.trim() === "") {
        throw new ApiError(400, "Content is required");
    }

    const comment  = await Comment.findById(commentId);
    if(!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Now only the person who has made that comment can update it 
    if( comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "only comment owner can edit their comments")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content  //Tells MongoDB to update only the content field of the comment
            }
        },
        { new: true}  //Returns the updated document instead of the old one. By default, MongoDB returns the original before update.
    );

    if(!updateComment){
        throw new ApiError(500, "Failed to edit comment please try again");
    }

    return res
    .status(200)
    .json( new ApiResponse(200, updateComment, "Comment edited successfully!"));
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const {commentId} = req.params;

    const comment  = await Commeent.findById(commentId);

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    if( comment?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "only comment owner can delete their comments")
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,  // Deletes all likes associated with this comment 
    });

    return res
    .status(200)
    .json(
        new ApiResponse(200, {commentId}, "Comment deleted Successfully!")
    )
});


export {
    getVideoComments,
    addComment,
    deleteComment,
    updateComment
}

