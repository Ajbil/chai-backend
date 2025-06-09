import mongoose, {isValidObjectId, Schema} from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {User} from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create a tweet
    const {content} = req.body;
    if(!content || content.trim() === ""){
        throw new ApiError(400, "content is required!");
    }

    const tweet = await Tweet.create({   // .create() performs botht he tasks it create a tweet document and saves it to Db so now need to explicitlky call save()
        content,
        owner: req.user?._id
    });

    if(!tweet) {
        throw new ApiError(500, "Failed to create tweet!");
    }

    return res
    .status(201)
    .json(new ApiResponse(201, {tweet}, "Tweet created successfully!"));
});

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {content} = req.body; 
    const {tweetId} = req.params;

    if(!content || content.trim() === ""){
        throw new ApiError(400, "content is required!");
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if(!tweet){
        throw new ApiError(404, "Tweet not found!");
    }

    //check that only owner of twet can update it 
    if(tweet?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(400, "You are not allowed to update this tweet!");
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {  // set operator only updates the specified fields in the document without touching other fields
                content
            }
        },
        {new : true}  //This option tells Mongoose to return the updated document. Without this, Mongoose would return the original (pre-update) document by default
    );

    if(!newTweet){
        throw new ApiError(5000, "Failed to eedit tweet try again");
    }

    return res
    .status(200)
    .json(new ApiResponse(200, {tweet :newTweet}, "Tweet updated successfully!"));
});

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweetId");
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    if (tweet?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(400, "only owner can delete thier tweet");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

    return res
    .status(200)
    .json(new ApiResponse(2--, {tweetId}, "Tweet deleted successfully!"));
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets  -- here i will need to apply aggregation pipeline 
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId");
    }

    //agggreagtion piepline 
    const tweets = await Tweet.aggregate([
        {
            $match: {   //Filters tweets that were created by the given user.
                owner : new mongoose.Types.ObjectId(userId)
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {   // get total number of liked per tweet 
                from : "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likeDetails",
                pipeline: [
                    {
                        $project: {
                            likedBy: 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likeDetails"
                },
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                isLiked: {  //whether the current logged-in user has liked each tweet.
                    $cond: {
                        if: {$in: [req.user?._id, "$likeDetails.likedBy"]}, // Check if the user's ID is in the likedBy array
                        then:true,
                        else:false
                    }
                }
            }
        },
        {
            $sort:  {
                createdAt: -1  // Sort by creation date in descending order
            }
        },
        {
            $project: {
                content:1,
                ownerDetails:1,
                likesCount: 1,
                createdAt: 1,
                isLiked: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(new ApiResponse(200, {tweets}, "tweets fetched successfully!"));
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}