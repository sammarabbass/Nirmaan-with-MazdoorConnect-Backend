const supplie=require("../models/module.Rental")

exports.uploadTools=async(req,res)=>{
    const{
catagory,
title,
brand,
total_quantity,
capacity,
fuel_type,
rate_per_hour,
rate_per_day,
rate_per_week,
rate_per_month,
security_deposit,
current_location
}=req.body;

const attachments=req.files.map((file)=>({
    url:file.path,
    type:file.mimetype.startsWith("image")?"image":file.mimetype.startsWith("video")?"video":"file",
    originalName:file.originalname,
    format:file.originalname.split(".").pop(),

}))||[];
console.log("Is attachments a real array?:", Array.isArray(attachments)); 
console.log("Raw attachments payload:", attachments);

try{
    if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
    
const prefixMap = {
            "Hand Tools": "TL",
            "Machinery": "MC",
            "Shuttering": "SH",
            "Power Tools": "PT"
        };

const prefix=prefixMap[catagory]||"GEN";
const randomId=Math.floor(10000+Math.random()*90000);
const automaticAssetId=`${prefix}-${randomId}`

const newitem=await supplie.create({
    asset_id:automaticAssetId,
    title,
    brand,
    catagory,
    total_quantity,
    rate_per_hour,
    rate_per_day,
    rate_per_month,
    rate_per_week,
    security_deposit,
    current_location,
    fuel_type,
    capacity,
    attachments,
    user: req.user.id,
});
return res.status(201).json({message:"ap ka saman list ma aya gay bus ab verify ka zaroorat ha ",suucess:true,
       newitem
})
}catch(err){
    res.status(500).json({message:err.message})
    console.log(err.message);
    
}
    }


exports.tools=async(req,res)=>{
    try{
        const tools=await supplie.findById(req.params.id).populate("user","cnic role")
        if(!tools){
            return res.status(404).json({message:"request not found"})
        }
        if(req.user.role!=="admin"&& tools.user._id.toString()!==req.user.id){
            return res.status(403).json({
                message:"not allowed"
            })
        }
                    res.json(tools)

    }catch(err){
            res.status(500).json({message:err.message})
            console.log(err.message);
            
}
}

exports.getmytools=async(req,res)=>{
    try{
        const mytools=await supplie.find({
            user:req.user.id,
        }).sort({createdAt:-1})
        res.json(mytools)
    }catch(err){
        res.status(500).json({message:err.message})
    }
}

exports.deletetools=async(req,res)=>{
    try{
        const tools=await supplie.findById(req.params.id)
        if(!tools){
            return res.status(404).json({message:"request not found"})
        }
        if(req.user.role!=="admin"&& tools.user._id.toString()!==req.user.id){
            return res.status(403).json({
                message:"not allowed"
            })
        }
        await tools.deleteOne()
                    res.json({message:"deleted"})

    }catch(err){
            res.status(500).json({message:err.message})
            console.log(err.message);
            
}
}


exports.updatetools=async(req, res)=> {
  try {
    const request = await supplie.findByIdAndUpdate(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (req.user.role !== "admin" && request.user.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not allowed" });
    }
    request.status = req.body.status || request.status;
    request.total_quantity = req.body.total_quantity || request.total_quantity;

    await request.save();
    res.json({
      message: "Request Updated",
    });
  } catch (err) {
    res.status(500).json({
      errors: err.message,
    });
  }
}



// admin works field
exports.updateStatus=async(req,res)=>{
    const {is_verified}=req.body
    try{
        const request = await supplie.findByIdAndUpdate(req.params.id,{
            is_verified,
        },
    {new:true});
    if(!request){
        return res.status(404).json({message:"not found "})
    }
    res.json({
        message:"status updated",
        request
    })
    }catch(err){
        res.status(500).json({message:err.message})
        console.log(err.message);
        
    }

}
exports.getalltools=async(req,res)=>{
    // try{
    //     const alltools=await supplie.findById().populate("user","phone cnic").sort({createdAt:-1})
    //     res.json(alltools)
    // }catch(err){
    //     res.status(500).json({message:err.message})
    //     console.log(err.message);
        
    // }
    try {
    const alltools = await supplie.find({})
      .populate("user", "role phone cnic")
      .sort({ createdAt: -1 });
      res.json(alltools);
  } catch (err) {
    res.status(500).json({
      errors: err.message,
    });
  }
}

