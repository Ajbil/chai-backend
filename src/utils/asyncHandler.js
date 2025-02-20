// promises vale pattern ke liye yeah code hai

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).
        catch((error) => { 
            next(error);
        });  
    }
}


export { asyncHandler };


/*  try-catch pattern ke liye yeah code hai
const asyncHandler = (fn) => async(req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        res.status(error.code || 500).json({
            success: false,
            message: error.message || "Something went wrong"
        });
    }
}

*/