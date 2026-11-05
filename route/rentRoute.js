const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Supplier = require("../models/module.Rental");
const { Thekedar, Project, RentalBooking } = require("../models/module.Thekadar");

const router = express.Router();
router.use(protect, (req, res, next) =>
  ["Thekadar", "Rental Customer"].includes(req.user.role) ? next() : res.status(403).json({ message: "Sirf Thekadar / Rental Customer" }));

const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const fail = (res, e) => res.status(e.name === "ValidationError" || e.name === "CastError" ? 400 : 500).json({ message: e.message });
const mine = async (req) => (req.user.role === "Thekadar"
  ? { thekedar: (await Thekedar.findOne({ user: req.user.id }))?._id }
  : { customer: req.user.id });

// verified + available saman (owner ka phone/cnic bahar nahi jata)
router.get("/items", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const f = { is_verified: true, status: "available" };
    if (req.query.catagory) f.catagory = req.query.catagory;
    if (req.query.location) f.current_location = { $regex: esc(req.query.location), $options: "i" };
    if (req.query.q) { const r = { $regex: esc(req.query.q), $options: "i" }; f.$or = [{ title: r }, { brand: r }]; }
    const [items, total] = await Promise.all([
      Supplier.find(f).select("-user").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Supplier.countDocuments(f),
    ]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { fail(res, e); }
});

router.get("/items/:id", async (req, res) => {
  try {
    const item = await Supplier.findOne({ _id: req.params.id, is_verified: true }).select("-user");
    if (!item) return res.status(404).json({ message: "Saman nahi mila" });
    res.json(item);
  } catch (e) { fail(res, e); }
});

router.post("/bookings", async (req, res) => {
  try {
    const { supplier_item, quantity = 1, duration, project } = req.body || {};
    const item = await Supplier.findOne({ _id: supplier_item, is_verified: true, status: "available" });
    if (!item) return res.status(404).json({ message: "Saman available nahi" });
    if (Number(quantity) > item.total_quantity) return res.status(409).json({ message: `Sirf ${item.total_quantity} available hain` });

    const data = { supplier_item: item._id, quantity: Number(quantity), duration: Number(duration), rate: item.rate_per_day };
    if (req.user.role === "Thekadar") {
      const me = await Thekedar.findOne({ user: req.user.id });
      if (!me) return res.status(404).json({ message: "Pehle thekedar profile banayein" });
      const p = await Project.findOne({ _id: project, thekedar: me._id, status: "ongoing" });
      if (!p) return res.status(404).json({ message: "Ongoing project nahi mila" });
      data.thekedar = me._id; data.project = p._id;
    } else {
      data.customer = req.user.id;
    }
    res.status(201).json({ message: "Booking ho gayi", booking: await RentalBooking.create(data) });
  } catch (e) { fail(res, e); }
});

router.get("/bookings/my", async (req, res) => {
  try {
    const f = await mine(req);
    if (req.query.status) f.status = req.query.status;
    res.json(await RentalBooking.find(f).populate("supplier_item", "title asset_id").populate("project", "title").sort({ createdAt: -1 }));
  } catch (e) { fail(res, e); }
});

router.put("/bookings/:id/cancel", async (req, res) => {
  try {
    const b = await RentalBooking.findOneAndUpdate({ _id: req.params.id, status: "booked", ...(await mine(req)) }, { status: "cancelled" }, { new: true });
    if (!b) return res.status(404).json({ message: "Booked booking nahi mili" });
    res.json({ message: "Booking cancel ho gayi", booking: b });
  } catch (e) { fail(res, e); }
});

module.exports = router;