// created  a custom error class which extends from NoeSJ built it error class  to handle the errors in a better way
class ApiError extends Error {
  constructor(
    statusCode, 
    message= "Something went wrong",
    errors =[],
    stack = ""
) {
    super(message);
    this.statusCode = statusCode;
    this.data = null
    this.message = message;
    this.success = false;
    this.errors = errors;

    if(stack){
        this.stack = stack;
    }
    else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };