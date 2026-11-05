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
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Adjust path to your User model if different

// Helper to safely detect production environment on Railway
const isProduction = process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT;

exports.login = async (req, res) => {
    try {
        const { cnic } = req.body;
        
        // Find user by CNIC
        const user = await User.findOne({ cnic });
        if (!user) {
            return res.status(404).json({ message: "User nahi mila!" });
        }

        // Generate Tokens (Ensure these secret keys match your Railway Variables)
        const accessToken = jwt.sign(
            { id: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );
        
        const refreshToken = jwt.sign(
            { id: user._id.toString() },
            process.env.REFRESH_SECRET,
            { expiresIn: "7d" }
        );

        // Save refresh token to user database
        user.refreshToken = refreshToken;
        await user.save();

        // Issue Access Token Cookie
        res.cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: isProduction,                   // true on Railway (HTTPS), false on Localhost
            sameSite: isProduction ? "none" : "lax", // none on Railway for cross-site, lax on Localhost
            maxAge: 15 * 60 * 1000,                  // 15 Minutes
        });

        // Issue Refresh Token Cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,                   // true on Railway (HTTPS), false on Localhost
            sameSite: isProduction ? "none" : "lax", // none on Railway for cross-site, lax on Localhost
            maxAge: 7 * 24 * 60 * 60 * 1000,         // 7 Days
        });

        return res.status(200).json({ message: "Welcome back!", user, accessToken });

    } catch (err) {
        console.error("Login Error:", err.message);
        return res.status(500).json({ message: err.message });
    }
};

exports.refresh_token = async (req, res) => {
    // FIX: Read cookie directly as a string, do not destructure {token}
    const token = req.cookies.refreshToken;
    
    if (!token) {
        return res.status(401).json({ message: "no refresh_token" });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
        const user = await User.findById(decoded.id);
        
        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: "invalid Token" });
        }
        
        // Generate a fresh access token
        const newAccessToken = jwt.sign(
            { id: user._id.toString(), role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        );
        
        // Issue updated Access Token Cookie with production safety configurations
        res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 15 * 60 * 1000,
        });
        
        return res.json({ message: "token refresh", accessToken: newAccessToken });

    } catch (err) {
        console.error("Refresh Token Error:", err.message);
        return res.status(403).json({ message: "Session expired, check back later." });
    }
};


exports.getAllData=async(req,res)=>{
    try{
        const request=await User.find().select("name phone cnic issueDate expirydate role").sort({createdAt:-1});
        res.json({request})
    }catch(err){
        res.status(500).json({message:err.message})
    }
}