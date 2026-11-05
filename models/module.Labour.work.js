const { default: mongoose } = require("mongoose");

// Thekedar mazdoor ko kaam deta hai -> yeh record mazdoor ke account mein khud add ho jata hai.
const workSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Registion", required: true }, // mazdoor
    thekedar: { type: mongoose.Schema.Types.ObjectId, ref: "Registion", required: true }, // kaam dene wala
    title: { type: String, required: true, trim: true }, // e.g. "Plaster kaam"
    location: { type: String, required: true, trim: true },
    start_date: { type: Date, default: Date.now },
    end_date: Date,
    days_worked: { type: Number, default: 0, min: 0 }, // thekedar update karta rehta hai
    daily_wage: { type: Number, required: true, min: 0 },
    total_earned: { type: Number, default: 0 }, // khud nikalta hai: days_worked * daily_wage
    amount_paid: { type: Number, default: 0, min: 0 }, // thekedar ne ab tak diya
    status: { type: String, enum: ["ongoing", "completed"], default: "ongoing" },
    notes: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

workSchema.virtual("amount_pending").get(function () {
  return this.total_earned - this.amount_paid; // thekedar ke zimme baqi
});

workSchema.pre("validate", function () {
  this.total_earned = (this.days_worked || 0) * (this.daily_wage || 0);
  if (this.amount_paid > this.total_earned) {
    this.invalidate("amount_paid", "amount_paid total kamai se zyada nahi ho sakta");
  }
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    this.invalidate("end_date", "end_date start_date se pehle nahi ho sakti");
  }
});

workSchema.index({ user: 1, start_date: -1 }); // mazdoor ke records
workSchema.index({ thekedar: 1, start_date: -1 }); // thekedar ke records

module.exports = mongoose.model("LabourWork", workSchema);