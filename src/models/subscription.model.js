import mongoose , {Schema} from "mongoose";

// THESE FIELDS WHAT I NEED IN MODEL I AM DECIDING BY MODEL DIAGRAM OF HITESH SIR 
//https://app.eraser.io/workspace/YtPqZ1VogxGy1jzIDkzj

const subscriptionSchema = new Schema({
    subscriber: {  // one who is subscribing to channel
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    channel: { // one who is being subscribed to
        type: Schema.Types.ObjectId,
        ref: "User" 
    }
},
{
    timestamps: true
}
);  

export const Subscription = mongoose.model("Subscription", subscriptionSchema); 