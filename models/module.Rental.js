const {default:mongoose}=require("mongoose")

const AttachmentSchema=new mongoose.Schema({
    url:String,
    type:String,
    originalName:String,
    format: String
},{_id:false})

const supplierSchema=new mongoose.Schema({
user:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"Registion",
    require:true,
    // sparse: true
},
attachments:[AttachmentSchema],
asset_id:{
    type:String,
    require:[true,"if you have no/did not find it/you machine is very old then contact our team"],
    unique:true,
},
catagory:{
    type:String,
    require:true,
},
title:{
    type:String,
    require:true
},
brand:{
    type:String,
    require:false,
    default:""
},
total_quantity:{
    type:Number,
    require:true,
    default:1
},
capacity:{
    type:String,
    default:""
},
fuel_type:{
    type:String,
    default:""
},
rate_per_hour:{
type:Number,
    require:true
},
rate_per_day:{
    type:Number,
    require:true
},
rate_per_week:{
type:Number,
    require:true
},
rate_per_month:{
type:Number,
    require:true
},
security_deposit:{
    type:Number,
    require:true,
    min:0
},
current_location:{
    type:String,
    require:true,
},
status:{
    type:String,
    require:true,
    enum:["available","at-work","not available"],
    default:"available"
},
is_verified: {
    type: Boolean,
    default: false // No quotes around false, and no enum array needed!
}



},{timestamps:true});
if (mongoose.models.services) {
  delete mongoose.models.services;
}
module.exports=mongoose.model("Supplier",supplierSchema)