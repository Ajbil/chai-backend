import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2"; // We need pagination plugin beacuse as we used in video model also comments can be grown very large and loading all comments at once is inefficient, so we will use pagination to load comments in chunks. It will provide us with metadata like total pages , limit , page so that we dont need to handle pagination manually 

const commentSchema = new Schema({
    content : {
        type: String,
        required : true
    },
    video : {
        type: Schema.Types.ObjectId,
        ref: "Video",
        required : true
    },
    owner : {
        type: Schema.Types.ObjectId,
        ref: "User",
        required : true
    }
},
{
    timestamps: true
});

commentSchema.plugin(mongooseAggregatePaginate);

export const Comment = mongoose.model("Comment", commentSchema);