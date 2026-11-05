const User=require("../models/module.User")
const jwt=require("jsonwebtoken")

exports.register=async(req,res)=>{
    const {name,phone,cnic,issueDate,expirydate,role}=req.body
     console.log("Postman se aaya hua data:", req.body); // 💡 Terminal mein check karein ke expiry date aa rahi hai ya nahi
   
    try{
        let match=await User.findOne({cnic})

        if(match){
            res.status(400).json({message:"user already register"})
        }
        if(cnic===13){
            res.status(400).json({message:"13 number is required"})
            console.log("13 number is required");
        }
        const newRegister=new User({
            name,
            phone,
            cnic,
            issueDate,
            role,
            expirydate
        })
        await newRegister.save()
            res.status(201).json({message:"registion successfully",newRegister})
    }catch(err){
        res.status(500).json({message:err.message})
        console.log(err.message);
        
    }
}

exports.login=async(req,res)=>{
    const {cnic}=req.body;
    try{
        const user=await User.findOne({cnic})
                if(cnic===13){
           return res.status(400).json({message:"13 number is required"})
            console.log("13 number is required");
        }
        if(!user){
           return res.status(404).json({message:"no registration"})
        }
        const accessToken=jwt.sign(
            {id:user.id,role:user.role},
            process.env.JWT_SECRET,
            {expiresIn:"15m"}
        )
        const refreshToken=jwt.sign(
            {id:user._id.toString(),role:user.role},
            process.env.REFRESH_SECRET,
            {expiresIn:"7d"}
        )

        user.refreshToken=refreshToken
        await user.save()
        res.cookie("accessToken",accessToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==="development",
            sameSite:"strict",
            maxAge: 15 * 60 * 1000,
            
        })
        res.cookie("refreshToken",refreshToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==="development",
            sameSite:"strict",
             maxAge: 7 * 24 * 60 * 60 * 1000,
        })
        res.status(200).json({message:"wellcome back",user,accessToken})
    }catch(err){
        res.status(500).json({message:err.message})
        console.log(err.message);
    }

}

exports.refresh_token=async(req,res)=>{
    const {token}=req.cookies.refreshToken
    if(!token){
        return res.status(404).json({message:"no refresh_token"})
    }
    try{
        const decoded=jwt.verify(token,process.env.REFRESH_SECRET)
        const user=await User.findById(decoded.id)
        if(!user||user.refreshToken!==token){
            return res.status(403).json({message:"invalid Token"})
        }
        const newAccessToken=jwt.sign(
            {id:user._id.toString(),role:user.role},
            process.env.JWT_SECRET,
            {expiresIn:"15m"}
        )
        res.cookie("accessToken", newAccessToken,{
            httpOnly:true,
            secure:process.env.NODE_ENV==="development",
            sameSite:"strict",
            maxAge: 15 * 60 * 1000,
        })
        res.json({message:"token refresh ",accessToken:newAccessToken})
    }catch(err){
        res.status(500).json({message:err.message})
        console.log(err.message);
        
    }
}


exports.getAllData=async(req,res)=>{
    try{
        const request=await User.find().select("name phone cnic issueDate expirydate role").sort({createdAt:-1});
        res.json({request})
    }catch(err){
        res.status(500).json({message:err.message})
    }
}