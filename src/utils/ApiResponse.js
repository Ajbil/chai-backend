class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = status;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}   