// Its work is to verify user hai ya nahi hai - logic is when user will login I have sent refresh and accestoken with that llogin request so i will check if he have correct token, and if corect then i will add a new object in req i.e req.user

import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";
import  jwt from ("jsonwebtoken");
import { User } from "../models/user.model";

export const verifyJWT = asyncHandler(async(req, res, next) => {
    // I need cookies access and which i get easily freom req object ass i ahve used cookie parser and when login then i added in res those cookies 
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        //verify this token using jwt
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).
        select("-password -refeshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
        // if we reached here means we have a verified user so I will add user in req.user and called next()
        req.user = user;
        next()
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }

})   // THIS MIDDLEWARE WE MADE WILL BE USED IN ROUTES -- protected route jaha honge there I will use it 