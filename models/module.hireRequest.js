const { default: mongoose } = require("mongoose");
const HouseProject = require("./module.HouseOnwer");

const { ObjectId } = mongoose.Schema.Types;

/* ============ HireRequest: house owner ki taraf se thekedar ko hire request ============ */
const hireRequestSchema = new mongoose.Schema({
  house_project: { type: ObjectId, ref: "HouseProject", required: true },
  house_owner: { type: ObjectId, ref: "Registion", required: true },
  thekedar: { type: ObjectId, ref: "Thekedar", required: true },     // Thekedar PROFILE ki id
  offered_amount: {                                                  // tay shuda qeemat, poore rupay
    type: Number, required: true, min: 1,
    validate: { validator: Number.isInteger, message: "{PATH} poore rupay mein hona chahiye" }
  },
  message: { type: String, trim: true, maxlength: 500 },
  status: { type: String, enum: ["pending", "accepted", "rejected", "cancelled"], default: "pending" },
  responded_at: Date
}, { timestamps: true });

// Aik thekedar ko aik project par aik waqt mein sirf aik pending request
hireRequestSchema.index(
  { house_project: 1, thekedar: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
hireRequestSchema.index({ thekedar: 1, status: 1, createdAt: -1 });
hireRequestSchema.index({ house_owner: 1, createdAt: -1 });

// Accept = request accept + HouseProject "ongoing" + thekedar ka Project banana + baqi requests reject
// Sab ek transaction mein: dono ya koi nahi (replica set chahiye)
hireRequestSchema.statics.accept = async function (requestId, thekedarId) {
  const session = await mongoose.startSession();
  try {
    let project;
    await session.withTransaction(async () => {
      const request = await this.findOne({ _id: requestId, thekedar: thekedarId, status: "pending" }).session(session);
      if (!request) throw new Error("Pending request nahi mili");

      // check aur badalna ek hi step mein: do thekedar ek saath accept karein to sirf ek ko milega
      const hp = await HouseProject.findOneAndUpdate(
        { _id: request.house_project, status: "open" },
        { status: "ongoing", thekedar: thekedarId },
        { session, new: true }
      );
      if (!hp) throw new Error("Ye project ab open nahi hai");

      [project] = await mongoose.model("Project").create(
        [{
          thekedar: thekedarId,
          title: hp.title,
          location: hp.location,
          total_amount: request.offered_amount,
          house_project: hp._id,
          house_owner: request.house_owner,
          start_date: new Date()
        }],
        { session }
      );

      request.status = "accepted";
      request.responded_at = new Date();
      await request.save({ session });

      // isi project ki baqi pending requests khud reject
      await this.updateMany(
        { house_project: hp._id, _id: { $ne: request._id }, status: "pending" },
        { status: "rejected", responded_at: new Date() },
        { session }
      );
    });
    return project;
  } finally {
    session.endSession();
  }
};

module.exports = mongoose.models.HireRequest || mongoose.model("HireRequest", hireRequestSchema);