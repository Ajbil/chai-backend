import mongoose, {Schema, isValidObjectId} from 'mongoose';
import {Video} from '../models/video.model.js';
import {User} from '../models/user.model.js';
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary , deleteOnCloudinary} from "../utils/cloudinary.js"
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    /*
    This controller fetches videos with full support for:

🔍 Full-text search ($search using Atlas Search)  --    Better than using $regex for text search — much faster and scalable.

🎛 Filtering by userId   --  Extracts filters from query params (e.g., /api/videos?page=2&limit=5&query=sports&sortBy=views).

📤 Only isPublished: true videos

🔃 Sorting (by views, createdAt, etc.)

📦 Pagination

🙍‍♂️ Populating owner info using $lookup

📑 Returning a clean, paginated response
    */ 

    //here i have two options eitherr to use regex for implmenting  Full Text based  search  or use search index in mongoDB ATLAS --
    // for using Full Text based search u need to create a search index in mongoDB atlas // you can include field mapppings in search index eg.title, description, as well // Field mappings specify which fields within your documents should be indexed for text search. // this helps in seraching only in title, desc providing faster search results // here the name of search index is 'search-videos'

    // i created a search index "search-videos" for test.users  in my mongoDB atlas -- but its wrong as i need to make it on videos collection not users -- do it later 
    const pipeline = [];

    if(query){
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"]  //search only on title , desc
                }
            }
        });
    }

    if(userId) {
        if(!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)  // filter videos by userId
            }
        });
    }

    pipeline.push({
        $match: {
            isPublished: true  // only get published videos
        }
    });
    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)

    if(sortBy && sortType){
        pipeline.push({
            $sort: {
                [sortBy]: sortType ==="asc" ?1 :-1
            }
        });
    }
    else{
        pipeline.push({
            $sort: {
                createdAt: -1
            }
        });
    }

    pipeline.push(
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
                            "avatar.url":1
                        }
                    }
                ]
            }
        }, 
        {
            $unwind: "$ownerDetails"  // Unwind the ownerDetails array to get a single object
        }
    );

    //lookup likes and count them 
    pipeline.push(
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as:"likesDetails"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likesDetails"
                }
            }
        },
        {
            $project: {
                likesDetails: 0 // Optional: remove full like details from final output
            }
        }
    );

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const video  = await Video.aggregatePaginate(videoAggregate, options);

    return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if([title, description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "Title and description are required");
    }

    //Extracts the local path of uploaded files from temp folder.
    const videoFileLocalPath = req.files?.videoFile[0].path;   // req.files comes from multer middleware which is used for file uploads
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    if(!videoFileLocalPath){
        throw new ApiError(400, "VideoLocalFilePath is required");
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400, "ThumbnailLocalPath is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile) {
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail not found");
    }

    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url : videoFile.url,
            public_id: videoFile.public_id  // used to manage/delete from Cloudinary
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user._id, //loggedin user ID provided by auth middleware 
        isPublished: false 
    });

    const videoUploaded = await Video.findById(video._id);  //Re-fetches the uploaded video to ensure it's saved.

    if(!videoUploaded) {
        throw new ApiError(500, "videoUpload failed please try again !!!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id -- here i am getting video details , like count , Whether the logged-in user has liked it, Owner details including subscriber count and subscription status, Adds the video to user’s watch history, increment view count by  1

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid userId");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true  // only get published videos
            }
        },
        {
            $lookup: {
                from : "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"  // Adds an array of likes to the video document.
            }
        },
        {
            $lookup: {   // lookpup to get video owner detailss (remeber he is also a user type object)
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [   // used a sub-pipeline to count video Owner's subscribers and check if current loggedin user is a subscriber to this video owner
                    {
                        $lookup: { // Gets all subscribers of this user (owner of the video).
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields : {
                            suscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed:{
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscribe"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {   // Only returns relevant fields from owner.
                            username: 1,
                            "avatar.url": 1,
                            suscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {   //Add Computed Fields to Video
                likesCount: {
                    $size: "$likes"
                },
                owner:{
                    $first: "$owner"  //the single user object (since $lookup returns an array).
                },
                isLiked: {  // whether current user liked the video 
                    $cond:{
                        if: {
                            $in: [
                                req.user?._id, "$likes.likedBy"
                            ]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {  //projects  Final structure of returned video object. Only includes necessary fields.
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    //If no video found (edge case), throw error.
    if(!video){
        throw new ApiError(404, "Failed to fetch video");
    }

    // increment views if video fetched successfully
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1  // increment views by 1
        }
    });

    //add thhis video to use watch histoiry 
    await user.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: new mongoose.Types.ObjectId(videoId)  // add videoId to watchHistory array
        }
    });

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "video details fetched successfully")  // Returns the video object (first item of aggregate result) with a success message.
        );
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body;
    // thumbnail is a file so we geet it from multer middleware and we need to remove the old thumbnail and put this new one 

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    if (!(title && description)) {
        throw new ApiError(400, "title and description are required");
    }

    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "No video found");
    }

    //only owner can update cideo detial
    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not allowed to update this video");
    }

    //deleting the old thumbnail and updating with new one 
    const thumbnailToDelete = video.thumbnail.public_id;  // get the public_id of old thumbnail to delete it from cloudinary

    const thumbnailLocalPath = req.file?.path;   // not used req.files?.thumbnail[0].path  beacuse here i will send only single thumbnail file from frontend 

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new ApiError(400, "Thumbnail upload failed");
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,  // update thumbnail public_id
                    url: thumbnail.url
                }
            }
        },
        { new: true}
    );

    if (!updatedVideo) {
        throw new ApiError(500, "Failed to update video please try again");
    }

    if (updatedVideo) {
        await deleteOnCloudinary(thumbnailToDelete);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "No video found");
    }

    //only owner can delete the video
    if(video?.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not allowed to delete this video");
    }   

    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    if (!videoDeleted) {
        throw new ApiError(400, "Failed to delete the video please try again");
    }

    //now delete the video file and thumbnail from cloudinary
    await deleteOnCloudinary(video?.videoFile?.public_id, "video");// specify video while deleting video
    await deleteOnCloudinary(video?.thumbnail?.public_id);

    //also i need to delete video likes and delete video comment 
    await Like.deleteMany({
        video: video?._id  //Deletes all likes associated with this video from the Like collection.
    })

    await Comment.deleteMany({
        video: video?._id
    })

    //here You could also delete related entries from Watch History or Playlists, if needed:
    /*
    await User.updateMany(
        {},
        { $pull: { watchHistory: video._id } }
    );

    await Playlist.updateMany(
        {},
        { $pull: { videos: video._id } }
    );
    */
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));  //Empty {} data is returned because the video no longer exists.
});


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(
            400,
            "You can't toogle publish status as you are not the owner"
        );
    }

    const toggleVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished  // toggle the isPublished status
            }
        },
        {new:true}
    );

    if (!toggleVideoPublish) {
        throw new ApiError(500, "Failed to toogle video publish status");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {isPublished: toggleVideoPublish.isPublished},  //returns The new isPublished status
            "Video publish status toggled successfully"
        )
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}