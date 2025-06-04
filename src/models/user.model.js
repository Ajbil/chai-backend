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
    coverImage: {
        type: String,    // we will use third part cloudinary url here
    },
    watchHistory: [   // this field is depenedent on video so see how to write this -- and it is an array
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
    next();  // it is a middlewware so when its work completes we call next()
});

//verifying password during login
userSchema.methods.isPasswordCorrect = async function(password) {  //this custom method will be used to compare password when user login
    return await bcrypt.compare(password, this.password);    //this.password is encrypted
}

// BOTH ACCESSTOKEN & REFRESHTOKEN are JWT tokens only 

//generating token for authentication
userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,  // this function is added on methods of userSchema and hence it will be available to all user objects created from this schema, so this._id will refer to the user object on which this method is called
            email: this.email,
            username: this.username,
            fullname: this.fullName,
        }, process.env.ACCESS_TOKEN_SECRET, 
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
}

// refresh token refreshes frequently and is used to get new access token when it expires without need of user to login again, so it has longer expiry time than access token
//generating refresh token for authentication
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