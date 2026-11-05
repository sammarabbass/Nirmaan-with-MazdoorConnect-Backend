const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const Supplier = require("../models/module.Rental");
const { RentalBooking } = require("../models/module.Thekadar");

const router = express.Router();
router.use(protect, (req, res, next) =>
  ["Rental", "Supplier"].includes(req.user.role) ? next() : res.status(403).json({ message: "Sirf Rental / Supplier" }));

const myItemIds = async (req) => (await Supplier.find({ user: req.user.id }).select("_id")).map((i) => i._id);

router.get("/bookings", async (req, res) => {
  try {
    const f = { supplier_item: { $in: await myItemIds(req) } };
    if (req.query.status) f.status = req.query.status;
    res.json(await RentalBooking.find(f)
      .populate("supplier_item", "title asset_id security_deposit")
      .populate({ path: "thekedar", populate: { path: "user", select: "name phone" } })
      .populate("customer", "name phone")
      .populate("project", "title")
      .sort({ createdAt: -1 }));
  } catch (e) { res.status(500).json({ message: e.message }); }
});

const NEXT = { booked: ["active", "cancelled"], active: ["returned"] }; // sahi order

router.put("/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body || {};
    const b = await RentalBooking.findOne({ _id: req.params.id, supplier_item: { $in: await myItemIds(req) } });
    if (!b) return res.status(404).json({ message: "Booking nahi mili" });
    if (!NEXT[b.status]?.includes(status)) return res.status(409).json({ message: `${b.status} se ${status} nahi ho sakta` });
    b.status = status;
    await b.save();
    res.json({ message: "Status badal gaya", booking: b });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;