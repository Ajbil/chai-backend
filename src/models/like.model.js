import mongoose, {Schema} from "mongoose";

const likeSchema = new Schema ({
    video : {   // for like on video
        type: Schema.Types.ObjectId,
        ref: "Video",
        required : true
    },
    comment : {   // for like on a comment
        type: Schema.Types.ObjectId,
        ref: "Comment",
        required : true
    },
    tweet: {  // for like on a tweet
        type: Schema.Types.ObjectId,
        ref: "Tweet",
    },
    likedBy : {
        type: Schema.Types.ObjectId,
        ref: "User",
        required : true
    }
},
{
    timestamps: true
});

export const Like = mongoose.model("Like", likeSchema);