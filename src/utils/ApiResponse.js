// to create a standard response format for the API i made this custom response class

class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = status;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}   