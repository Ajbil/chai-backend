import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const healthCheck = asyncHandler(async( req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, {message: "Everything is O.K "}, "OK"));
});

export { healthCheck };