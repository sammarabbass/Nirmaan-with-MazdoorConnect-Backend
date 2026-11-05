// const {default:mongoose}=require("mongoose")
const Labour = require("../models/module.Labour");

const PROFILE_FIELDS = ["skill", "experience_years", "daily_rate", "location", "about", "availability"];
const ROLE_LABOUR = "Labour";
const MAX_FILES = 5;

// body se sirf allowed fields lo (koi user/total_earned jaisi field zabardasti nahi bhej sakta)
const pick = (obj = {}, keys) => keys.reduce((o, k) => (obj[k] !== undefined ? ((o[k] = obj[k]), o) : o), {});

const mapFiles = (files = []) =>
  files.map((f) => ({
    url: f.path,
    type: f.mimetype.startsWith("image") ? "image" : f.mimetype.startsWith("video") ? "video" : "file",
    originalName: f.originalname,
    format: f.originalname.split(".").pop(),
  }));

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// true = role sahi hai, aage barho. Warna 403 bhej kar false.
const requireRole = (req, res, role) => {
  if (req.user?.role !== role) {
    res.status(403).json({ message: `Yeh sirf ${role} ke liye hai` });
    return false;
  }
  return true;
};
const requireLabour = (req, res) => requireRole(req, res, ROLE_LABOUR);

const fail = (res, err) => {
  console.log(err.message);
  const status = err.name === "ValidationError" || err.name === "CastError" ? 400 : 500;
  return res.status(status).json({ message: err.message });
};

/* ---------------- PROFILE (mazdoor ka apna post) ---------------- */

// POST /api/v3/profile
exports.createProfile = async (req, res) => {
  try {
    if (!requireLabour(req, res)) return;
    if (await Labour.exists({ user: req.user.id })) {
      return res.status(409).json({ message: "Profile pehle se bana hua hai. Update karein." });
    }
    const profile = await Labour.create({
      ...pick(req.body || {}, PROFILE_FIELDS),
      attachments: mapFiles(req.files),
      user: req.user.id,
    });
    return res.status(201).json({ message: "Profile post ho gaya", profile });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/v3/profile  (apna profile)
exports.getMyProfile = async (req, res) => {
  try {
    if (!requireLabour(req, res)) return;
    const profile = await Labour.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: "Abhi profile nahi bana" });
    return res.json(profile);
  } catch (err) {
    return fail(res, err);
  }
};

// PUT /api/v3/profile  (details badlo, nayi files add karo)
exports.updateProfile = async (req, res) => {
  try {
    if (!requireLabour(req, res)) return;
    const profile = await Labour.findOne({ user: req.user.id });
    if (!profile) return res.status(404).json({ message: "Pehle profile banayein" });

    const newFiles = mapFiles(req.files);
    if (profile.attachments.length + newFiles.length > MAX_FILES) {
      return res.status(400).json({ message: `Maximum ${MAX_FILES} files allowed` });
    }

    profile.set(pick(req.body || {}, PROFILE_FIELDS));
    profile.attachments.push(...newFiles);
    await profile.save();
    return res.json({ message: "Profile update ho gaya", profile });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/v3/all?skill=&location=&availability=&page=&limit=  (thekedar / house owner mazdoor dhoondhein)
exports.listLabour = async (req, res) => {
  try {
    const { skill, location, availability = "available" } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const filter = {};
    if (skill) filter.skill = skill;
    if (availability !== "all") filter.availability = availability;
    if (location) filter.location = { $regex: escapeRegex(location), $options: "i" };

    const [items, total] = await Promise.all([
      Labour.find(filter)
        .populate("user", "name phone") // cnic bahar nahi jati
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Labour.countDocuments(filter),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return fail(res, err);
  }
};
exports.getMyRecord = async (req, res) => {
  try {
    if (!requireLabour(req, res)) return;
 
    // req.user.id Registion ki id hai, ledger mein Labour PROFILE ki id hoti hai
    const profile = await Labour.findOne({ user: req.user.id }).select("_id");
    if (!profile) return res.status(404).json({ message: "Abhi profile nahi bana" });
 
    const mine = { [LEDGER_LABOUR_FIELD]: profile._id };
    const paidMatch = { ...mine, type: "paid_to_labour" };
 
    const [earned, paid, recent] = await Promise.all([
      // total: hazri se mazdoor ka banta hua, project ke hisaab se
      Attendance.aggregate([{ $match: mine }, { $group: { _id: "$project", total: { $sum: "$amount" } } }]),
      // paid: ab tak mila, reversal wali entry minus hoti hai
      Payment.aggregate([
        { $match: paidMatch },
        { $group: { _id: "$project", total: { $sum: { $cond: ["$is_reversal", { $multiply: ["$amount", -1] }, "$amount"] } } } },
      ]),
      Payment.find(paidMatch).sort({ createdAt: -1 }).limit(20).select("amount is_reversal project createdAt"),
    ]);
 
    // dono ko project ke hisaab se ek jagah milao
    const byProject = new Map();
    const row = (id) => {
      const key = String(id);
      if (!byProject.has(key)) byProject.set(key, { project: id, total: 0, paid: 0 });
      return byProject.get(key);
    };
    earned.forEach((e) => (row(e._id).total = e.total));
    paid.forEach((p) => (row(p._id).paid = p.total));
 
    const rows = [...byProject.values()];
    const projects = await Project.find({ _id: { $in: rows.map((r) => r.project) } }).select("title location");
    const info = new Map(projects.map((p) => [String(p._id), p]));
 
    const list = rows.map((r) => ({
      project: info.get(String(r.project)) || { _id: r.project }, // delete hua project ho to sirf id
      total: r.total,
      paid: r.paid,
      pending: r.total - r.paid, // baqi, store nahi hota
    }));
 
    const total = list.reduce((t, r) => t + r.total, 0);
    const paidSum = list.reduce((t, r) => t + r.paid, 0);
 
    return res.json({
      summary: { total, paid: paidSum, pending: total - paidSum },
      projects: list,
      recent_payments: recent,
    });
  } catch (err) {
    return fail(res, err);
  }
};