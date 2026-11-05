const multer=require("multer")
const cloudinary =require("../config/cloudinary")
const {CloudinaryStorage}=require("multer-storage-cloudinary")

const storage= new CloudinaryStorage({
    cloudinary,
    params:async(req,file)=>{
        // if(file.mimetype?.startsWith("image")){
        //     resourceType="image";
        // }
        // if(file.mimetype?.startsWtih("video")){
        //     resourceType="video"
        // }
           if (file.mimetype?.startsWith("image")) {
      resourceType = "image";
    }
    if (file.mimetype?.startsWith("video")) {
      resourceType = "video";
    }
        return{
            folder:"Nirmaan assests",
            resource_type:"auto"
        }
    }
   
    })
     const upload=multer({
        storage,
        limits:{
            fileSize:50*1024*1024,
        },

});
module.exports=upload