const {default:mongoose}=require("mongoose")
const UserSchema=new mongoose.Schema({
name:{
    type:String,
    require:true,
    unique:true,
    lowercase:true,
    trim:true
},
phone:{
    type:String,
    require:true,
    unique:true,
     trim: true,
    validate: {
      // Yeh regex check karega ke number sirf 92 ya 03 se shuru ho aur digits sahi hon
      validator: function(v) {
        return /^(03\d{9}|923\d{9})$/.test(v);
      },
    message: props => `${props.value} sahi phone number nahi hai! Format 923xxxxxxxxx ya 03xxxxxxxxx hona chahiye.`
      }
},
cnic: {
    type: String, // Type String hi rahegi taake shuru ka '0' save ho sake
    required: true,
    unique: true,
    trim: true,
    validate: {
        validator: function(v) {
            // Yeh sirf characters ki length check karega aur check karega ke sirf numbers hon
            return typeof v === 'string' && v.length === 13 && /^\d+$/.test(v);
        }},
      message: 'CNIC mein pure 13 digits hone chahiye aur dashes nahi honi chahiye!'
    },
    issueDate:{
    type:Date,
    require:true,
       validate: {
      validator: function(value) {
        // Issue date hamesha aaj ki date se pehle (past mein) honi chahiye
        return value <= new Date();
      },
      message: 'Issue date future ki nahi ho sakti!'
    },
     expirydate: {
    type: Date,
    required: [true, 'CNIC ki expiry date lazmi hai']
    // 💡 Filhal validation ka 'validate' block poora hata dein testing ke liye
}
    },
    role:{
      type:String,
      enum:["Supplier","Rental","Rental Customer","House Onwer","Thekadar","Labour","admin"]
    }
    ,
    refreshToken:String,
    // resetTokenExpire : Date
  }
)

module.exports=mongoose.model("Registion",UserSchema)