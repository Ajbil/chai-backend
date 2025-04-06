import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";    


const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true // for faster search in DB
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    avatar: {
        type: String,    // we will use third part cloudinary url here
        required: true
    },
    coverimage: {
        type: String,    // we will use third part cloudinary url here
    },
    watchHistory: [   // this field is depenedent on video so see how to write this 
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required:[true, "Password is required"]
    },
    refreshToken: {
        type: String
    }
},
{
    timestamps: true
}
);

//middleware to hash passsword before saving to DB
userSchema.pre("save", async function(next) { // encrytpion takes time so use async await  ||   and here i cant write it using arrrow function becasue they dont have refernce of this and so i would not be able to use this.password  -- see video for detail undersatnding 6:45:00
    if (this.isModified("password")) { // if password is modified then only encrypt it  before supppose user changed its avatar then we dont want to update password , we only want to encrypt password for first time or when it is changed 
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

//verifying password during login
userSchema.methods.isPasswordCorrect = async function(password) {  //this custom method will be used to compare password when user login
    return await bcrypt.compare(password, this.password);
}

//generating token for authentication
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullName,
        }, process.env.ACCESS_TOKEN_SECRET, 
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

// refresh token are long-lived token then access token
userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        }, process.env.REFRESH_TOKEN_SECRET, 
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
}


export const User = mongoose.model("User", userSchema);