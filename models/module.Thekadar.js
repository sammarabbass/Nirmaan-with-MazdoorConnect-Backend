const { default: mongoose } = require("mongoose");

const { ObjectId } = mongoose.Schema.Types;

// Paisa hamesha poore rupay (integer) mein: float ki galtiyan nahi hoti
const money = (extra = {}) => ({
  type: Number,
  min: 0,
  validate: { validator: Number.isInteger, message: "{PATH} poore rupay mein hona chahiye" },
  ...extra
});

/* ============ QADAM 1: Thekedar profile ============ */
const thekedarSchema = new mongoose.Schema({
  user: { type: ObjectId, ref: "Registion", required: true, unique: true },
  city: { type: String, required: true, trim: true },
  experience_years: { type: Number, min: 0, default: 0 },
  is_verified: { type: Boolean, default: false }
}, { timestamps: true });

/* ============ QADAM 2: Labour (mazdoor ka profile) ============ */
// Alag file module.Labour.js mein hai. Hiring ko iske do fields chahiye: status (available/hired) aur daily_rate
const Labour = require("./module.Labour");

/* ============ QADAM 3: Project (thekedar ka kaam) ============ */
const projectSchema = new mongoose.Schema({
  thekedar: { type: ObjectId, ref: "Thekedar", required: true },
   house_project: { type: ObjectId, ref: "HouseProject" },   // <-- nayi line
  house_owner: { type: ObjectId, ref: "Registion" },
  title: { type: String, required: true, trim: true },
  location: { type: String, required: true, trim: true },
  total_amount: money({ required: true }),          // client se kul milna hai
  status: { type: String, enum: ["ongoing", "completed", "cancelled"], default: "ongoing" },
  start_date: Date,
  end_date: Date,
  isDeleted: { type: Boolean, default: false },     // soft delete: record kabhi nahi mitta
  deletedAt: Date
}, { timestamps: true });

projectSchema.index({ thekedar: 1, status: 1, createdAt: -1 });

// Soft-deleted projects har find se bahar rehte hain (zaroorat ho to {withDeleted:true} option)
projectSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) this.where({ isDeleted: { $ne: true } });
});

projectSchema.pre("validate", function () {
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    this.invalidate("end_date", "end_date start_date se pehle nahi ho sakti");
  }
});

/* ============ QADAM 4: Hiring (kaun mazdoor kis project par) ============ */
const hiringSchema = new mongoose.Schema({
  project: { type: ObjectId, ref: "Project", required: true },
  thekedar: { type: ObjectId, ref: "Thekedar", required: true },
  labour: { type: ObjectId, ref: "Labour", required: true },
  daily_wage: money({ required: true }),            // hire ke waqt ki rate (freeze)
  status: { type: String, enum: ["active", "completed", "cancelled"], default: "active" },
  start_date: { type: Date, default: Date.now },
  end_date: Date
}, { timestamps: true });

// Aik mazdoor aik project par aik waqt mein sirf aik active hiring
hiringSchema.index(
  { project: 1, labour: 1 },
  { unique: true, partialFilterExpression: { status: "active" } }
);
hiringSchema.index({ thekedar: 1, status: 1 });

// Hire = hiring banana + labour ko "hired" karna, dono ya koi nahi (transaction)
// NOTE: transaction ke liye MongoDB replica set chahiye (Atlas mein by default hota hai)
hiringSchema.statics.hire = async function ({ project, labour, daily_wage }) {
  const session = await mongoose.startSession();
  try {
    let doc;
    await session.withTransaction(async () => {
      const proj = await mongoose.model("Project").findOne({ _id: project, status: "ongoing" }).session(session);
      if (!proj) throw new Error("Project ongoing nahi hai");

      const l = await Labour.findOneAndUpdate(
        { _id: labour, status: "available" },
        { status: "hired" },
        { session, new: true }
      );
      if (!l) throw new Error("Mazdoor available nahi hai");

      [doc] = await this.create(
        [{ project, thekedar: proj.thekedar, labour, daily_wage: daily_wage ?? l.daily_rate }],
        { session }
      );
    });
    return doc;
  } finally {
    session.endSession();
  }
};

/* ============ QADAM 5 aur 6: Attendance aur Payment ============ */
// Ye dono models Ledger.js mein hain (neeche require hota hai)

/* ============ QADAM 7: Project ka poora hisaab (getFinance) ============ */
// Ledger + attendance se, kuch bhi duplicate save nahi hota
projectSchema.methods.getFinance = async function () {
  const Payment = mongoose.model("Payment");
  const Attendance = mongoose.model("Attendance");
  const Hiring = mongoose.model("Hiring");
  const RentalBooking = mongoose.model("RentalBooking");

  const [byType, earned, labour_hired, rent] = await Promise.all([
    Payment.aggregate([
      { $match: { project: this._id } },
      { $group: {
          _id: "$type",
          total: { $sum: { $cond: ["$is_reversal", { $multiply: ["$amount", -1] }, "$amount"] } }
      } }
    ]),
    Attendance.aggregate([
      { $match: { project: this._id } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]),
    Hiring.countDocuments({ project: this._id, status: { $ne: "cancelled" } }),
    RentalBooking.aggregate([
      { $match: { project: this._id, status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total_cost" } } }
    ])
  ]);

  const sum = (t) => byType.find((x) => x._id === t)?.total || 0;
  const received = sum("received");
  const paid_to_labour = sum("paid_to_labour");
  const rental_paid = sum("rental_paid");
  const labour_earned = earned[0]?.total || 0;
  const rental_total = rent[0]?.total || 0;

  return {
    total_amount: this.total_amount,
    received,                                   // ab tak mila
    pending: this.total_amount - received,      // kaam ke baad milna baqi
    labour_hired,                               // kitne mazdoor rakhe
    labour_earned,                              // attendance se mazdooron ka banta hua
    paid_to_labour,                             // mazdooron ko diya
    labour_due: labour_earned - paid_to_labour, // mazdooron ka baqi
    rental_total,
    rental_paid,
    rental_due: rental_total - rental_paid,
    profit_so_far: received - paid_to_labour - rental_paid
  };
};

/* ============ QADAM 8: Kaam khatam (Hiring.release) ============ */
// Hiring band, mazdoor dobara available
hiringSchema.statics.release = async function (hiringId, status = "completed") {
  const session = await mongoose.startSession();
  try {
    let doc;
    await session.withTransaction(async () => {
      doc = await this.findOneAndUpdate(
        { _id: hiringId, status: "active" },
        { status, end_date: new Date() },
        { session, new: true }
      );
      if (!doc) throw new Error("Active hiring nahi mili");
      await Labour.updateOne({ _id: doc.labour }, { status: "available" }, { session });
    });
    return doc;
  } finally {
    session.endSession();
  }
};

/* ============ QADAM 9: RentalBooking (Supplier ka saman) ============ */
const rentalSchema = new mongoose.Schema({
  thekedar: { type: ObjectId, ref: "Thekedar" },     // thekedar ki booking mein hota hai (required nahi)
  customer: { type: ObjectId, ref: "Registion" },    // Rental Customer ki booking mein hota hai
  project: { type: ObjectId, ref: "Project" },       // sirf thekedar ki booking mein
  supplier_item: { type: ObjectId, ref: "Supplier", required: true },
  quantity: { type: Number, default: 1, min: 1, validate: Number.isInteger },
  rate: money({ required: true }),                  // per din
  duration: { type: Number, required: true, min: 1, validate: Number.isInteger }, // din
  total_cost: money({ default: 0 }),
  status: { type: String, enum: ["booked", "active", "returned", "cancelled"], default: "booked" }
}, { timestamps: true });

rentalSchema.index({ project: 1, status: 1 });

rentalSchema.pre("validate", function () {
  this.total_cost = this.rate * this.duration * this.quantity;
});

/* ============ Register aur export ============ */
// Models yahan, sab methods/statics lagne ke BAAD register hote hain (pehle register karenge to wo lagenge nahi)
const Thekedar = mongoose.models.Thekedar || mongoose.model("Thekedar", thekedarSchema);
const Project = mongoose.models.Project || mongoose.model("Project", projectSchema);
const Hiring = mongoose.models.Hiring || mongoose.model("Hiring", hiringSchema);
const RentalBooking = mongoose.models.RentalBooking || mongoose.model("RentalBooking", rentalSchema);

// Ledger ke models (Payment, Attendance) bhi saath register ho jayen
// const { Payment, Attendance } = require("./Ledger");

module.exports = { Thekedar, Project, Hiring, RentalBooking, };