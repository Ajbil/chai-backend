import mongoose, {Schema, isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params   //PUT /api/subscriptions/:channelId

    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId");
    }
    //one additionlal thing to check i want to prevent suelf-subscription 
    //check if channelId equals loggedin user id 
    if(channelId.toString() === req.user?._id.toString()){
        throw new ApiError(400, "You cannot subscribe to yourself");
    }

    // now finding currenlty user is subscribedd and  Searches the Subscription collection for a document with: subscriber : current loggedin user and channel : channelID
    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    });

    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
        .status(200)
        .json(new ApiResponse(200, {subscribed: false}, "Unsubscribed from channel successfully!"));
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    });

    return res
    .status(200)
    .json(new ApiResponse(200, {subscribed: true}, "Subscribed to channel successfully!"));
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId");
    }

    /*
     Goal of the Controller
To return a list of subscribers for a specific channel (channelId), along with:

their basic profile (e.g., username, full name, avatar)

their subscriber count (how many subscribers they have)

whether the channel owner is also subscribed to each of these subscribers
    */

    channelId = new mongoose.Types.ObjectId(channelId); // converts to mongoose ObjectId so that i can safely user aggregation pipeline on it 

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel:channelId,  // here i got the subscribers to this channel as each docuemnt here reperesnets someone who subscriberd to this channel
            }
        }, // extra functinility doing --- Join with users Collection to Get Subscriber Info
        {
            $lookup: {
                from:"users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [   // Nested Lookup: Check if Channel Owner has Subscribed to the Subscriber
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",  //For each subscriber, checks if the channelId is also subscribing back to them.
                            as: "subscribedToSubscriber"
                        }
                    },
                    { //adding computed fields
                        $addFields: {
                            subscribedToSubscriber: {   //a boolean indicating whether the current channel owner is also subscribed back to this user(the subscriber).
                                $cond: {
                                    if: {
                                        $in : [channelId, "$subscribedToSubscriber.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber"  //Count of subscribers for each subscriber
                            }
                        }
                    },
                ]
            }
        },
        {
            $unwind: "$subscriber" //After $lookup, subscriber is an array (from users collection).  so  $unwind faltttedns it to an object 
        },
        {
            $project: {
                _id: 0,
                subscriber:{
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToSubscriber: 1,
                    subscribersCount: 1
                }
            }
        }
    ]);
    return res
    .status(200)
    .json(new ApiResponse(200, subscribers, "Subscribers fetched successfully!"));
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {

    // fetch all channels that a specific user (subscriberId) has subscribed to, and for each of those channels, it includes info about the channel and their latest uploaded video.

    const { subscriberId } = req.params
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid subscriberId");
    }

    subscriberId = new mongoose.Types.ObjectId(subscriberId);

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: subscriberId
            }
        },
        {
            $lookup: {
                from: "users",
                localField:"channel",
                foreignField: "_id",
                as: "subscribedChannel",
                pipeline: [
                    {
                        $lookup: {
                            from:"videos",
                            localField: "_id",
                            foreignField: "owner",
                            as:"videos"
                        }
                    },
                    {
                        $addFields:{
                            latestVideo: {
                                $last: "$videos"
                            }
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribedChannel"
        },
        {
            $project: {
                _id:0,
                subscribedChannel : {
                    _id: 1,
                        "videoFile.url": 1,
                        "thumbnail.url": 1,
                        owner: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1
                }
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new ApiResponse
        (
            200,
            subscribedChannels,
            "subscribed channels fetched successfully!"
        )
    );
});

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}