import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";


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

    if(!username || !email){
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

    const loggedInUser = User.findById(user._id).    // 27:00 video see
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


export { registerUser, loginUser, logoutUser };