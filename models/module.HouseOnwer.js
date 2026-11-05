// const {default:mongoose}=require("mongoose")
// const projectSchema = new mongoose.Schema({
//   thekedar: { type:mongoose.Schema.Types.ObjectId, ref: "Thekedar", required: true },
//   title: { type: String, required: true, trim: true },
//   description:{type:String,required:true,},
//   location: { type: String, required: true, trim: true },
//   total_amount: {type:Number, required: true },          // client se kul milna hai
//   status: { type: String, enum: ["ongoing", "completed", "cancelled"], default: "ongoing" },
//   start_date: Date,
//   end_date: Date,
//   isDeleted: { type: Boolean, default: false },     // soft delete: record kabhi nahi mitta
//   deletedAt: Date
// }, { timestamps: true });

// projectSchema.index({ thekedar: 1, status: 1, createdAt: -1 });

// // Soft-deleted projects har find se bahar rehte hain (zaroorat ho to {withDeleted:true} option)
// projectSchema.pre(/^find/, function () {
//   if (!this.getOptions().withDeleted) this.where({ isDeleted: { $ne: true } });
// });

// projectSchema.pre("validate", function () {
//   if (this.start_date && this.end_date && this.end_date < this.start_date) {
//     this.invalidate("end_date", "end_date start_date se pehle nahi ho sakti");
//   }
// });

// module.exports=mongoose.model("Project",projectSchema)

const { default: mongoose } = require("mongoose");

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video", "file"], default: "file" },
    originalName: String,
    format: String,
  },
  { _id: false }
);

const houseProjectSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Registion", required: true }, // house owner (req.user.id)
    thekedar: { type: mongoose.Schema.Types.ObjectId, ref: "Thekedar" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    total_amount: { type: Number, required: true },
    status: { type: String, enum: ["open","ongoing", "completed", "cancelled"], default: "open" },
    attachments: [attachmentSchema],
  },
  { timestamps: true }
);

houseProjectSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("HouseProject", houseProjectSchema);