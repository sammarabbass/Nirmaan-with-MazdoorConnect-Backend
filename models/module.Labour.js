const { default: mongoose } = require("mongoose");

// Mazdoor ka apna "post" (profile): kya kaam aata hai, kitna tajurba, rate, kahan available.
const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video", "file"], default: "file" },
    originalName: String,
    format: String,
  },
  { _id: false }
);

const labourSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Registion", required: true, unique: true }, // ek mazdoor = ek profile
    skill: {
      type: String,
      enum: ["mistri", "mazdoor", "helper", "plumber", "electrician", "painter", "carpenter", "welder", "other"],
      required: true,
    },
    experience_years: { type: Number, min: 0, max: 60, default: 0 },
    daily_rate: { type: Number, min: 0, required: true }, // Rs per din
    location: { type: String, required: true, trim: true },
    about: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ["available", "busy", "not available"], default: "available" },
    attachments: [attachmentSchema], // kaam ki photos / video (max 5, controller check karta hai)
  },
  { timestamps: true }
);

labourSchema.index({ skill: 1, location: 1, availability: 1 }); // thekedar ki search ke liye

module.exports = mongoose.model("Labour", labourSchema);