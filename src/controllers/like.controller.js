// Toggle functinality menas on user click  -- If the user has already liked the item (video, comment, or tweet) → remove the like.
// If the user has not liked it yet → add a like.

import mongoose, {Schema} from "mongoose";
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    //TODO: Toggle like on a video
    const {videoId}  = req.params;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    //check if user has already liked that video
    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id   // actually no need of optional chaining as If you know req.user._id exists after verifyJWT, you can directly use it.
    });

    if(likedAlready){
        //i need to unlike 
        await Like.findByIdAndDelete(likedAlready?._id);
        // another way to do is by savign and extra read operation as i already have ID   -- await Like.deleteOne({_id: likedAlready?._id});

        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}, "Video unliked successfully!"));   
// this isLiked will be used by the frontend to update the UI accordingly 
        /*
        if (response.data.isLiked) {
            showLikeButtonFilled();
        } else {
            showLikeButtonOutline();
        }
        */
    }
    //if not liked thne like it 
    await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}, "Video liked successfully!"));  
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    //TODO : Toggle like on a comment
    const {commentId} = req.params;
    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid commentId");
    }

    //check if user has already liked that comment
    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id  
    });

    if(likedAlready){
        //i need to unlike 
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
        .status(200)
        .json(new ApiResponse(200, {isLiked: false}, "Comment unliked successfully!"));   
    }

    //if not liked then like it 
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    return res
    .status(200)
    .json(new ApiResponse(200, {isLiked: true}, "Comment liked successfully!")); 
});

const toggleTweetLike = asyncHandler(async(req,res) => {
    //TODO : Toggle like on a tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }


    const likedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { tweetId, isLiked: false }, "Tweet unliked successfully!"));
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }, "Tweet liked successfully!"));
})

const getLikedVideos  = asyncHandler(async (req, res) => {
    //TODO : Get all liked videos by the user
    // I will be returning all videos liked by the logged-in user, along with video and video owner details.

    const likedVideosAggregate = await Like.aggregate([
        {
            $match: {
                likedBy : new mongoose.Types.ObjectId(req.user?._id),   /// here i cant directly use likedBy : req.use?._id beacuse In an aggregation pipeline, MongoDB does strict type matching and likedBy in our collection is of type ObjectId but req.user._id is of type string    -- in normal mongoose queries however we can do like (e.g., Like.find({ likedBy: req.user._id })
            }
        },
        {
            $lookup: {  //Join with videos collection
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",  //matched video will be stored in this new array field.
                pipeline: [   // join with user to get video owner detial
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails"
                        },
                    },
                    {
                        $unwind: "$ownerDetails"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideo"
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                }
            }
        }
    ]);

    //pagination Splits results into pages, avoids over-fetching.
        const options = {
            page: pareseInt(page,10),  //Converts the page query param (which is a string from the URL) into a number. e.g., '2' → 2  -- example url /api/v1/videos/123/comments?page=2&limit=10
            limit: parseInt(limit, 10)
        };
    
        const likedVideos = await Like.aggregatePaginate(
            likedVideosAggregate, 
            options
        );
    
        return res
        .status(200)
        .json(new ApiResponse(200, likedVideos, "liked videos fetched successfully"));
});

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}