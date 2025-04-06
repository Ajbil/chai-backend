import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors(
    {
        origin: process.env.CORS_ORIGIN,    // production level connfiguration did
        credentials: true
    }
));

app.use(express.json(
    {
        limit: "16kb"
    }
)); // Enables parsing of JSON request body

app.use(express.urlencoded({ extended: true,limit: "16kb" })); 
app.use(express.static("public")); // Serves static files from the public directory
app.use(cookieParser()); // server se user ke browser ki cookies access kar pau i.e  perfoorm CRUD operations on cookies

export  { app };