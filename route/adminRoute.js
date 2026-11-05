const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const { Thekedar, RentalBooking } = require("../models/module.Thekadar");
const HouseProject = require("../models/module.HouseOnwer");
const HireRequest = require("../models/module.hireRequest");

const router = express.Router();
router.use(protect, isAdmin); // sab routes sirf admin ke liye

const send = (res, p) => p.then((d) => res.json(d)).catch((e) => res.status(500).json({ message: e.message }));

router.get("/thekedars", (req, res) =>
  send(res, Thekedar.find().populate("user", "name phone cnic").sort({ createdAt: -1 })));

router.put("/thekedars/:id/verify", (req, res) =>
  send(res, Thekedar.findByIdAndUpdate(req.params.id, { is_verified: !!req.body.is_verified }, { new: true })));

router.get("/projects", (req, res) =>
  send(res, HouseProject.find()
    .populate("user", "name phone")
    .populate({ path: "thekedar", populate: { path: "user", select: "name" } })
    .sort({ createdAt: -1 })));

router.get("/requests", (req, res) =>
  send(res, HireRequest.find()
    .populate("house_project", "title")
    .populate("house_owner", "name")
    .populate({ path: "thekedar", populate: { path: "user", select: "name" } })
    .sort({ createdAt: -1 })));

router.get("/bookings", (req, res) =>
  send(res, RentalBooking.find()
    .populate("supplier_item", "title asset_id")
    .populate({ path: "thekedar", populate: { path: "user", select: "name" } })
    .populate("project", "title")
    .sort({ createdAt: -1 })));

module.exports = router;