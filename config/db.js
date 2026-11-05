const {default:mongoose}=require("mongoose")

const connectDB=async()=>{
    try{
    await mongoose.connect(process.env.MONGO_URI,{})
    console.log(`ha ab database sa connect hogay`);
    }catch(err){
        console.error(err.message);
    }
}

module.exports=connectDB