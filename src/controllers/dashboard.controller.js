import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

    const userId = req.user?._id;
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId");
    }
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId) //We filter Subscription documents where channel matches the userId (i.e., user is the channel owner).
            }
        },
        {
            $group: {  //count the number of documents (e.g. subscriptions) that matched the previous stage of the pipeline.
                _id: null,  // means all documents are grouped into a single group
                subscribersCount: {
                    $sum:1
                }
            }
        }
    ]);
//easy way to get without using aggragtion piplei  --   const totalSubscribers = await Subscription.find({channel:req.user._id}).countDocuments()

    // totalviews likes and total videos i can get by using one aggragteion pipelin eon videso collection
    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField:"_id",
                foreignField:"video",
                as:"likes" //adds a likes array to each video document
            }
        },
        {
            $project:{
                totalLikes:{
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group:{
                _id:null,
                totalLikes:{
                    $sum:"#totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ]);

    const channelStats = {
        totalSubscribers : totalSubscribers[0]?.subscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "channel stats fetched successfully"
            )
        );
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel i.e curremntly loggedin user along with some other info

    const userId = req.user?._id;
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid userId");
    }

    const videos = await Video.aggregate([
        {
            $match: {
                owner : new mongoose.Types.ObjectId(userId) // We filter Video documents where owner matches the userId (i.e., user is the channel owner).
            }
        },
        {
            $lookup: {  //For each video, fetch all related documents from the likes collection where video matches the video _id.
                from : "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes" // adds a likes array to each video document  i.e array of likes per video 
            }
        },
        {
            $addFields: {
                createdAt: {
                   $dateToParts: { date: "$createdAt" } 
                },
                likesCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $sort: {
                createdAt: -1 // Sorts the videos in descending order based on the createdAt field.
            }
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1
                },
                isPublished: 1,
                likesCount: 1
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videos,
            "channel videos fetched successfully"
        )
    );
});

export {
    getChannelStats, 
    getChannelVideos
    }