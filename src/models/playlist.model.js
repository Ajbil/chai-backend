import mongoose, {Schema} from "mongoose";

const playlistSchema = new Schema ({
    name : {
        type: String,
        required : true
    },
    description : {
        type: String,
        required : true
    },
    videos: [ // it is an array as a playlist can have multiple videos
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    owner : {  //owner will be one only
        type: Schema.Types.ObjectId,
        ref: "User"
    }
},
{
    timestamps: true
})

export const Playlist = mongoose.model("Playlist", playlistSchema); 