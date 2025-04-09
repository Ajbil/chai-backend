// I have used mongoDb Atlas online and there Ajbil's Org - 2025-01-28 > Project 0 

import mongoose from 'mongoose';
import { DB_NAME } from '../constants.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host} \n`);
    } catch (err) {
        console.error("MongoDB connection Failed ", err);
        process.exit(1); // there are many exit codes - read about them
    }
}


export default connectDB;