// require('dotenv').config({path: './env'});
// import mongoose from "mongoose"

import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({path: './env'}); //Reads the .env file and adds its variables to process.env, making them accessible throughout the app. and we can use them then like process.env.PORT, process.env.MONGODB_URI etc.

connectDB()
.then(() => {
    const server = app.listen(process.env.PORT || 80000, () => {
        console.log(`Server is listening on port : ${process.env.PORT}`); 
    });

    //handles server connection error
    server.on("error", (err) => {
        console.error("Server connection error : ", err);
        process.exit(1); // Exit the process on server connection failure
    });
})
.catch((err) => {
    console.error("Mongo Db connection falied !! ", err);
    process.exit(1); // Exit the process on DB connection failure
})





/*   This is one way of connecting to DB and starting the server

import express from 'express';
const app = express();

( async() => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("errror", (error) => {
            console.log("ERRR : `", error);
            throw error
        })


        app.listen(process.env.PORT, () => {
            console.log("APP is listening on port ${process.env.PORT}");
        })
    }
    catch(err){
        console.error("Error: ", err);
        throw err
    }
})()

*/






