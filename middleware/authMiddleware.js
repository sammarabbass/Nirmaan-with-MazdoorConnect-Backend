const jwt=require("jsonwebtoken")

const handleTokenExpiry = (req, res, next) => {
    return res.status(401).json({ 
        success: false, 
        message: "Session expired or token missing. Please log in again." 
    });
};
exports.protect = (req, res, next) =>{
const token = req.cookies?.accessToken;
if(!token){
    return handleTokenExpiry(req, res, next);
}
    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
       return next(); // lets search it 
    }catch(err){
          console.log("JWT Error:", err.message); 
            if (err.name === 'TokenExpiredError') {
            // Cookie se refresh token nikalien (Iske liye 'cookie-parser' package installed hona chahiye)
            const refreshToken = req.cookies?.refreshToken; 

            if (!refreshToken) {
                return res.status(401).json({ message: "Access token expired & No refresh token found" });
            }

            try {
                // 3. Refresh token ko verify karein (Yahan aapka refresh secret aayega)
                const refreshDecoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || process.env.JWT_SECRET);
                
                // 4. Naya Access Token generate karein
                const newAccessToken = jwt.sign(
                    { id: refreshDecoded.id, role: refreshDecoded.role }, 
                    process.env.JWT_SECRET, 
                    { expiresIn: '15m' }
                );
                
                // 5. Naya token response headers mein bhej dein taake client isko save kar sake
                res.setHeader('x-access-token', newAccessToken);
                
                // User ka data request mein dalen aur aage bhej dein
                req.user = refreshDecoded;
                return next();
            } catch (refreshErr) {
                console.log("Refresh Token Error:", refreshErr.message);
                return res.status(403).json({ message: "Refresh token invalid or expired. Please login again." });
            }
    }
      res.status(401).json({message:"Invalid Token"})
}
};

exports.isAdmin=async(req,res,next)=>{
try{
    
    const userRole = req.user.role.toLowerCase().trim();
    if(userRole!=="admin"){
       return res.status(403).json({message:"Admin only"})
    }
    return next();
}catch(err){
    res.status(500).json({message:err.message})
    console.log(err.message);
    
}
}