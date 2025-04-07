import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler( async (req, res) => {
    /*Steps
    — get user details from frontend 

— validation of what user has provided , like email not empty

— check if user already exists, using email, username

— check for images, check for avatar

— upload them on cloudinary, avatar was required filed so check if it is properly uploaded 

— create user object — create user in DB 

— now when sending response remove password and refreshToken field

— check for user created successfully or error aa gaya
    */
    const { fullName, email, username, password } = req.body; // destructuring the data from request body
    //console.log("email:", email); // for debugging purpose


    // if(fullName === ""){
    //     throw new ApiError(400, "Full name is required"); // 400 bad request error
    // }  -- like this i can check for each field but below is advanced way to do it

    if(
        [fullName, email, username, password].some((filed) =>
        filed?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required"); // 400 bad request error
    }


    // User.findOne({ email }).then((user) => {
    //     if(user) {
    //         throw new ApiError(400, "User already exists"); // 400 bad request error
    //     }
    // })  -- this is a simple way to do it but below is advanced way to do it -- i want that no user should have same username or email so i check for botjh in advanced manner 
    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })
    //console.log("existedUser:", existedUser); // for debugging purpose
    if(existedUser) {
        throw new ApiError(409, "User already exists"); // 400 bad request error
    }


    // check for images, check for avatar  -- not like express gives us access to req.body similary multer gives us access to req.files -- so we can check if avatar is present or not -- if needed see video for it
    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path  //-- we used optional chaining here as If req.files is undefined (e.g., the user didn’t upload any files), and you try to access req.files.avatar[0].path, it will throw an error and crash app . by using ? if any of above is missing we just get undefined and app does not break

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required"); // 400 bad request error
    }


    // upload them on cloudinary, avatar was required filed so check if it is properly uploaded
    const avatar = await uploadOnCloudinary(avatarLocalPath); 
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null; // if cover image is not provided then we set it to null

    if(!avatar) {
        throw new ApiError(500, "Avatar upload failed, reupload it"); // 500 internal server error
    }


    // create user object — create user in DB
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "", // if cover image is not provided then we set it to empty
        email,
        password,
        username: username.toLowerCase(),
    })
    
    // checking if user sach mai created or not
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // we dont want to send password and refresh token in response so we use select method to exclude them from the response

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user"); // 500 internal server error
    }


    // send response to user
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

})

export { registerUser };