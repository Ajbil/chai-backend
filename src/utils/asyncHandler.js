// promises vale pattern ke liye yeah code hai
/*
asyncHandler(requestHandler) takes an async function (requestHandler).
It returns a new function that:
Calls requestHandler(req, res, next) inside Promise.resolve().
If requestHandler resolves successfully, everything works as expected.
If it rejects (throws an error), .catch(error => next(error)) passes the error to Express's built-in error handling middleware.
*/

const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).
        catch((error) => { 
            next(error);   // here we use express built in error handling mechanism to handle the error  which we cant use in below try-catch pattern
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

How it works --
asyncHandler(fn) takes an async function (fn) as input and returns a new function that executes fn.
If fn throws an error, it is caught and sent as a response.
*/