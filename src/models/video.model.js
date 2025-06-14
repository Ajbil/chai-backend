import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";    // with help of this pagination plugin we can write aggregate queries 

const videoSchema = new Schema(
    {
        videoFile: {
            type: String, //cloudinary url
            required: true
        },
        thumbnail: {
            type: String, //cloudinary url
            required: true
        },
        title: {
            type: String, 
            required: true
        },
        description: {
            type: String, 
            required: true
        },
        duration: {   //cloudinary will give this detail
            type: Number, 
            required: true
        },
        views: {
            type: Number,
            default: 0
        },
        isPublished: {
            type: Boolean,
            default: true
        },
        owner: {  // this filed is linked to user so see how i wrote this
            type: Schema.Types.ObjectId,
            ref: "User"
        }

    }, 
    {
        timestamps: true
    }
)

videoSchema.plugin(mongooseAggregatePaginate);  // Now it allows us to write aggreagtion queries here 

export const Video = mongoose.model("Video", videoSchema)