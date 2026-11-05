const HouseProject = require("../models/module.HouseOnwer");
const HireRequest = require("../models/module.hireRequest");
const { Thekedar, Project } = require("../models/module.Thekadar"); // apni models file ka sahi naam likhein

const ROLE_HOUSE_OWNER = "House Onwer"; // backend role enum ki spelling
const ROLE_ADMIN = "admin";
const POST_FIELDS = ["title", "description", "location", "total_amount"]; // status body se nahi, hamesha "open"
const REQUEST_STATUSES = ["pending", "accepted", "rejected", "cancelled"];

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
const requireHouseOwner = (req, res) => {
  if (req.user?.role !== ROLE_HOUSE_OWNER) {
    res.status(403).json({ message: `Yeh sirf ${ROLE_HOUSE_OWNER} ke liye hai` });
    return false;
  }
  return true;
};

// update / delete par house owner ya admin
const requireOwnerOrAdmin = (req, res) => {
  if (req.user?.role !== ROLE_HOUSE_OWNER && req.user?.role !== ROLE_ADMIN) {
    res.status(403).json({ message: "Not allowed" });
    return false;
  }
  return true;
};

// admin ko sab projects, owner ko sirf apne
const ownerFilter = (req) => (req.user.role === ROLE_ADMIN ? {} : { user: req.user.id });

const fail = (res, err) => {
  console.log(err.message);
  if (err.code === 11000) {
    return res.status(409).json({ message: "Is thekedar ko is project par pehle se pending request ja chuki hai" });
  }
  const status = err.name === "ValidationError" || err.name === "CastError" ? 400 : 500;
  return res.status(status).json({ message: err.message });
};

// thekedar ke "kaam mukammal / chal rahe" ki ginti, ek hi aggregate se (soft-deleted nahi ginte)
const projectCounts = async (thekedarIds) => {
  const rows = await Project.aggregate([
    { $match: { thekedar: { $in: thekedarIds }, isDeleted: { $ne: true } } },
    { $group: { _id: { thekedar: "$thekedar", status: "$status" }, n: { $sum: 1 } } },
  ]);
  const map = new Map();
  rows.forEach((r) => {
    const key = String(r._id.thekedar);
    if (!map.has(key)) map.set(key, { completed: 0, ongoing: 0 });
    if (r._id.status === "completed") map.get(key).completed = r.n;
    if (r._id.status === "ongoing") map.get(key).ongoing = r.n;
  });
  return map;
};

/* ---------------- APNE PROJECTS ---------------- */

// POST /api/v2/post
exports.createPost = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const project = await HouseProject.create({
      ...pick(req.body || {}, POST_FIELDS),
      attachments: mapFiles(req.files),
      user: req.user.id, // status model ka default: "open"
    });
    return res.status(201).json({ message: "Project post ho gaya, ab thekedar dhoondein", project });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/v2/my
exports.getMyPosts = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const posts = await HouseProject.find({ user: req.user.id })
      .populate({ path: "thekedar", select: "city experience_years is_verified user", populate: { path: "user", select: "name phone" } })
      .sort({ createdAt: -1 });
    return res.json(posts);
  } catch (err) {
    return fail(res, err);
  }
};

// PUT /api/v2/update/:id  body: { status: "cancelled" }  (sirf open project cancel ho sakta hai)
exports.updateStatuss = async (req, res) => {
  try {
    if (!requireOwnerOrAdmin(req, res)) return;
    if (req.body?.status !== "cancelled") {
      return res.status(400).json({ message: "Sirf status cancelled kiya ja sakta hai. Baqi status khud badalte hain." });
    }
    const post = await HouseProject.findOne({ _id: req.params.id, ...ownerFilter(req) });
    if (!post) return res.status(404).json({ message: "project not found" });

    // check aur badalna ek hi step mein: sath hi thekedar accept kar de to ye null dega
    const done = await HouseProject.findOneAndUpdate({ _id: post._id, status: "open" }, { status: "cancelled" }, { new: true });
    if (!done) return res.status(409).json({ message: "Sirf open project cancel ho sakta hai" });

    // is project ki pending requests bhi band
    await HireRequest.updateMany({ house_project: post._id, status: "pending" }, { status: "cancelled", responded_at: new Date() });
    return res.json({ message: "Project cancel ho gaya", project: done });
  } catch (err) {
    return fail(res, err);
  }
};

// DELETE /api/v2/deleted/:id  (sirf open project delete ho sakta hai)
exports.deletePost = async (req, res) => {
  try {
    if (!requireOwnerOrAdmin(req, res)) return;
    const post = await HouseProject.findOne({ _id: req.params.id, ...ownerFilter(req) });
    if (!post) return res.status(404).json({ message: "project not found" });

    const removed = await HouseProject.findOneAndDelete({ _id: post._id, status: "open" });
    if (!removed) return res.status(409).json({ message: "Thekedar mil chuka hai, ab delete nahi ho sakta. Pehle project band karein." });

    await HireRequest.updateMany({ house_project: post._id, status: "pending" }, { status: "cancelled", responded_at: new Date() });
    return res.json({ message: "deleted" });
  } catch (err) {
    return fail(res, err);
  }
};

/* ---------------- THEKEDAR DHOONDNA ---------------- */

// GET /api/v2/thekedars?city=&verified=true&min_experience=&page=&limit=
exports.listThekedars = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;

    const { city, verified, min_experience } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);

    const filter = {};
    if (city) filter.city = { $regex: escapeRegex(city), $options: "i" };
    if (verified === "true") filter.is_verified = true;
    if (Number.isFinite(Number(min_experience)) && min_experience !== undefined && min_experience !== "") {
      filter.experience_years = { $gte: Number(min_experience) };
    }

    const [items, total] = await Promise.all([
      Thekedar.find(filter)
        .populate("user", "name") // phone aur cnic bahar nahi jate
        .sort({ is_verified: -1, experience_years: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Thekedar.countDocuments(filter),
    ]);

    const counts = await projectCounts(items.map((t) => t._id));
    const list = items.map((t) => ({
      _id: t._id,
      name: t.user?.name,
      city: t.city,
      experience_years: t.experience_years,
      is_verified: t.is_verified,
      completed_projects: counts.get(String(t._id))?.completed || 0,
      ongoing_projects: counts.get(String(t._id))?.ongoing || 0,
    }));
    return res.json({ items: list, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/v2/thekedars/:id
exports.getThekedar = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const t = await Thekedar.findById(req.params.id).populate("user", "name").lean();
    if (!t) return res.status(404).json({ message: "Thekedar nahi mila" });

    const [completed, ongoing, recent] = await Promise.all([
      Project.countDocuments({ thekedar: t._id, status: "completed", isDeleted: { $ne: true } }),
      Project.countDocuments({ thekedar: t._id, status: "ongoing", isDeleted: { $ne: true } }),
      Project.find({ thekedar: t._id, status: "completed" }).sort({ end_date: -1, createdAt: -1 }).limit(5).select("title location end_date"), // paisa nahi
    ]);

    return res.json({
      _id: t._id,
      name: t.user?.name,
      city: t.city,
      experience_years: t.experience_years,
      is_verified: t.is_verified,
      completed_projects: completed,
      ongoing_projects: ongoing,
      recent_projects: recent,
    });
  } catch (err) {
    return fail(res, err);
  }
};

/* ---------------- HIRE REQUEST ---------------- */

// POST /api/v2/hire-requests  body: { house_project, thekedar, offered_amount, message? }
exports.sendRequest = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const { house_project, thekedar, offered_amount, message } = req.body || {};
    if (!house_project || !thekedar || offered_amount === undefined) {
      return res.status(400).json({ message: "house_project, thekedar aur offered_amount zaroori hain" });
    }

    const hp = await HouseProject.findOne({ _id: house_project, user: req.user.id });
    if (!hp) return res.status(404).json({ message: "Project nahi mila" });
    if (hp.status !== "open") return res.status(409).json({ message: "Sirf open project par request ja sakti hai" });

    if (!(await Thekedar.exists({ _id: thekedar }))) return res.status(404).json({ message: "Thekedar nahi mila" });

    const request = await HireRequest.create({
      house_project: hp._id,
      house_owner: req.user.id,
      thekedar,
      offered_amount: Number(offered_amount),
      message,
    });
    return res.status(201).json({ message: "Request bhej di", request });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/v2/hire-requests?status=&page=&limit=
exports.myRequests = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const { status } = req.query;
    if (status && !REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ${REQUEST_STATUSES.join(" / ")} mein se ho` });
    }
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 12, 1), 50);
    const filter = { house_owner: req.user.id };
    if (status) filter.status = status;

    // thekedar ka phone sirf accept ke baad
    const userFields = status === "accepted" ? "name phone" : "name";

    const [items, total] = await Promise.all([
      HireRequest.find(filter)
        .populate("house_project", "title location status")
        .populate({ path: "thekedar", select: "city experience_years is_verified user", populate: { path: "user", select: userFields } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      HireRequest.countDocuments(filter),
    ]);
    return res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    return fail(res, err);
  }
};

// PUT /api/v2/hire-requests/:id/cancel  (sirf pending request wapas li ja sakti hai)
exports.cancelRequest = async (req, res) => {
  try {
    if (!requireHouseOwner(req, res)) return;
    const request = await HireRequest.findOneAndUpdate(
      { _id: req.params.id, house_owner: req.user.id, status: "pending" },
      { status: "cancelled", responded_at: new Date() },
      { new: true }
    );
    if (!request) return res.status(404).json({ message: "Pending request nahi mili" });
    return res.json({ message: "Request wapas le li", request });
  } catch (err) {
    return fail(res, err);
  }
};