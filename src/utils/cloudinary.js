import {v2 as cloudinary} from "cloudinary"
import fs from "fs"


// Configuration
cloudinary.config({ 
    cloud_name: 'process.env.CLOUDINARY_CLOUD_NAME', 
    api_key: 'process.env.CLOUDINARY_API_KEY', 
    api_secret: 'process.env.CLOUDINARY_API_SECRET' 
});
    

const uploadOnCloudinary = async (localFilePath) => {
    try{
        if(!localFilePath) return null
        // upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        })
        //file has been uploaded successfully 
        console.log("File uploaded successfully on cloudiinary : ", response.url);
        return response;
    }
    catch(error){
        fs.unlinkSync(localFilePath); // Delete the file from local storage as uploading on cloudinary failed -- did it in Synchronous way i.e yeah hona hi chahiye tabhi aage badhenege 
        return null;
    }
}


export {uploadOnCloudinary}












