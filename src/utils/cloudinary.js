import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY
});

const uploadToCloudinary = async (localFilePath) => {
    
    try
    {
        if(!localFilePath) return null

        // Upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto'
        })
        
        return response;
    }

    catch(error)
    {
        fs.unlinkSync(localFilePath);    // Remove the locally saved file as upload failed
        return null  
    }
}

export { uploadToCloudinary }