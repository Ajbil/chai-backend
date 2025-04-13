import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken(); 
        const refreshToken = user.generateRefreshToken(); 

        user.refreshToken = refreshToken; // i need to store refreshToken in DB, no need for accesstoken 
        await user.save({ validateBeforeSave: false });  // saved in Db -- seee video to understand why used this 23:00
        return { accessToken, refreshToken };

    } catch (error) {
        throw new ApiError(500, "Something went wrong while genrating refresj and access token !!")
    }
};

const registerUser = asyncHandler( async (req, res) => {  // using asyncHandler() to wrap this controller — that way, any throw inside gets caught and passed to Express's error handling middleware.
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
        [fullName, email, username, password].some((field) =>
        field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required"); // 400 bad request error
    }


    // User.findOne({ email }).then((user) => {
    //     if(user) {
    //         throw new ApiError(400, "User already exists"); // 400 bad request error
    //     }
    // })  -- this is a simple way to do it but below is advanced way to do it -- i want that no user should have same username or email so i check for botjh in advanced manner 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    //console.log("existedUser:", existedUser); // for debugging purpose
    if(existedUser) {
        throw new ApiError(409, "User already exists"); // 400 bad request error
    }
    //console.log(req.files);  -- uncomment to see what req.files object returns

    // check for images, check for avatar  -- not like express gives us access to req.body similary multer gives us access to req.files -- so we can check if avatar is present or not -- if needed see video for it
    // const avatarLocalPath = req.files?.avatar[0]?.path  //-- we used optional chaining here as If req.files is undefined (e.g., the user didn’t upload any files), and you try to access req.files.avatar[0].path, it will throw an error and crash app . by using ? if any of above is missing we just get undefined and app does not break  -- but when i teseted using psotamn it broke so below method used to write code
    //const coverImageLocalPath = req.files?.coverImage[0]?.path  

    let avatarLocalPath; 
    if(req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path;
    }
    console.log(avatarLocalPath);

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path; // check if cover image is present or not
    }
    console.log(coverImageLocalPath); // for debugging purpose


    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required"); // 400 bad request error
    }


    // upload them on cloudinary, avatar was required filed so check if it is properly uploaded
    const avatar = await uploadOnCloudinary(avatarLocalPath); 
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;// if cover image is not provided then we set it to null

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
    
    // checking if user sach mai created or not by refethcing user from DB but excluded sensitive data 
    const createdUser = await User.findById(user._id).select("-password -refreshToken"); // we dont want to send password and refresh token in response so we use select method to exclude them from the response

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user"); // 500 internal server error
    }


    // send response to user
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )

});

const loginUser= asyncHandler(async (req, res) => {
    /* steps 
    get data from req.body
    check existence of user on basis of username/email
    find the user in Db
    password check
    access and refresh token generate 
    send tokens by cookies  and send res that succefully logined
    */

    const { email, username, password } = req.body; // destructuring the data from request body
    console.log(email);

    if(!username && !email){
        throw new ApiError(400, "Username or email is required"); // 400 bad request error
    }
    
    // abhi I have not decided ki username or email kiske basis pe login karana hai user ko so i am writing code accordingly which finds either username or email in DB - so it is some advanced way 
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User not exists"); // 401 unauthorized error
    }

    // password check
    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Credentials"); // 401 unauthorized error
    }

    // access and refresh token generate  -- this we will do many time so made a method of it 
    const {accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const loggedInUser = await User.findById(user._id).    // 27:00 video see
    select("-password -refreshToken")

    //send cookies
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)        // as I imporrted cookie parser middlweare so i can sent as many as cookie i want using .cookie()
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "User logged in successfully!"
        )
    )
});

//logic is remove cookies of that user and also refeshToken of that user from DB  -- Here i will need to design my ownn middleware see video for why 
const logoutUser = asyncHandler(async(req, res) => {
    // now here i have aaccess of req.user beacuse its a secured route as i used auth middleware on thisn route. so i can get user easily now 
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User loggedOut Successfully!"))
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    //access the refeshtoken firstly 
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    // verify the incoming refreshToken -- becasuee from user ke pass jo hai vo toh encrypted hai and Db mai raw token saved hai 
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = User.findById(decodedToken?._id)   // remember while making refresh token i just passed user id as payload so here i get it by ._id
    
        if(!user){
            throw new ApiError(401, "invalid refresh token")
        }
    
        //now i need to match that this incomingReq token set by user is matching with what we save in our databae using  generateAcessAndRefresh token funciton -- then only i can confirm that this is the same user who is trying to login again
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "RefreshToken is expired or used")
        };
    
        // if we came here then everythoing okay so generate new access token for this user
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access Token Refreshed!"  
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")  
    }
});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const { oldPassword, newPassowrd } = req.body;

    const user = await User.findById(req.user._id) // now user is able to change password so it is sure that he must been loggedin so then it means he passed auth middleware and so i have access to req.user so i use it to get id of user
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(401, "Invalid Old Password")
    }

    user.password = newPassowrd;
    await user.save({ validateBeforeSave: false }) 

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")   
    )
});

const getCurrentUser = asyncHandler(async(req, res) => {
// i have put full user info in req.user in auth middleware so i can access it here directly
    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetched successfully")
    )
});

//now above we have function for cchanging password now if i want to update other details of user for this below mehtod 
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email } = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "Full name and email are required")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }   
        },
        {new: true}
    ).select("-password") 

    return res.status(200)
    .json( new ApiResponse(200, user, "Account details updated successfully"))
});

//Now about we wrote code for updating text based data now for files its some differnt -- i need to use multer middleware to access files and also auth middleware so that only logged in user an update files -- routing ke time pe keep this in mindd 
const updateUserAvatar = asyncHandler(async(req, res) => {
    // firtly i am using multer so ican access file like req.file
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is missing.")
    };

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    //now if i dont get url then its proble
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar on cloudinary")
    }

    //Now finally update avatar filed
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url  // logic see that in my user model i have only string value in avatar fled beacuse i have taken only url, so here avatar is full object i dont need it so took only url using avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Avatar updated successfully")
    )
});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    // firtly i am using multer so ican access file like req.file
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is missing.")
    };

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    //now if i dont get url then its proble
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading coverImage on cloudinary")
    }

    //Now finally update avatar filed
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url  // logic see that in my user model i have only string value in avatar fled beacuse i have taken only url, so here avatar is full object i dont need it so took only url using avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
});

export { registerUser, loginUser, logoutUser, refreshAccessToken,changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage };