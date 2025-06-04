import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});
    
//file upload can cause error so we will use try catch block
const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded successfully 
        // console.log("File uploaded successfully on cloudiinary : ", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(error){
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error("Upload failed:", error);
        return null;
    }
}


export {uploadOnCloudinary}












