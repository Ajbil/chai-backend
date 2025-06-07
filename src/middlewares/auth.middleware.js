// Its work is to verify user login hai ya nahi hai - logic is when user will login I have sent refresh and accestoken with that llogin request so i will check if he have correct token, and if corect then i will add a new object in req i.e req.user

import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _ , next) => {  // no need of res so put _ 
    // I need cookies access and which i get easily freom req object ass i ahve used cookie parser and when login then i added in res those cookies 
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");  //I have sent accesstoken in res.cookie()  but then also i am checking in header also - video --beacause it may be possible that user is loggining in from mobile or toll like postman they dont use cookies instad they pass token sin headers 
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        //verify this token using jwt
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).  // as when i made model i had _id filed in token so i can get user using this _id
        select("-password -refeshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
        // if we reached here means we have a verified user so I will add user in req.user and called next()
        req.user = user;       //addding a new property to req object which will be available in all routes where this middleware is used, so i can use it to get user info like email, fullname etc. and i can use it in protected routes to get user info without querying DB again and again
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

})   // THIS MIDDLEWARE WE MADE WILL BE USED IN ROUTES -- protected route jaha honge there I will use it 