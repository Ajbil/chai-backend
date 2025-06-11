//I see that here in this file i am setting up some configurations using .use() like its my backend so frontend will provide data now data can come in anyformat like json, raw, urlencoded , files etc. so i have to tell my express app that what kind of data it will receive and how to handle it)

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// this .use() used for middleware registration or configuration settings 
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,    // production level connfiguration did
        credentials: true  // Always set credentials: true if you're sending cookies or tokens. i.e it allows cookies and headers like Authorization to be sent
    }
));

// It's a middleware which Enables parsing of JSON request body and attaches it to req.body
app.use(express.json(           
    {
        limit: "16kb"
    }
)); 

app.use(express.urlencoded({ extended: true,limit: "16kb" }));  /// above express.json is used for parsing JSON data, this is used for parsing URL-encoded data (like form submissions).
app.use(express.static("public")); // Serves static files from the public directory
app.use(cookieParser()); // server se user ke browser ki cookies access kar pau i.e  perfoorm CRUD operations on cookies

app.get("/", (req, res) => {
    res.send("Server is running fine !!");
});

//routes import
import userRouter from './routes/user.routes.js'
import commentRouter from './routes/comment.routes.js';
import likeRouter from "./routes/like.routes.js"
import tweetRouter from './routes/tweet.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import healthcheckRouter from "./routes/healthcheck.routes.js";
import videoRouter from './routes/video.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import dashboardRouter from "./routes/dashboard.routes.js"

//routes declaration 
app.use("/api/v1/users", userRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/tweet", tweetRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/dashboard", dashboardRouter)

export  { app };

//one ques came that above i could also have used app.get() but instead i used app.use()
// -- Use app.get() for individual route definitions. Its like saying "If someone knocks exactly at the front door, respond to them."
// -- Use app.use() to register routers or middleware under a base path.  its like saying "For anything under the /api/v1/users section, forward it to another handler (userRouter)."