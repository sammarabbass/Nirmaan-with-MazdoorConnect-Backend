const User = require("../models/module.User"); // wohi path jo asal mein exist karta hai
const jwt = require("jsonwebtoken");

// Railway par production detect karne ke liye
const isProduction =
  process.env.NODE_ENV === "production" || !!process.env.RAILWAY_ENVIRONMENT;

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS par true, localhost par false
  sameSite: isProduction ? "none" : "lax", // cross-site ke liye none
};

// ---------- REGISTER ----------
exports.register = async (req, res) => {
  const { name, phone, cnic, issueDate, expirydate, role } = req.body;

  try {
    if (!cnic || String(cnic).length !== 13) {
      return res.status(400).json({ message: "13 digit CNIC is required" });
    }

    const match = await User.findOne({ cnic });
    if (match) {
      return res.status(400).json({ message: "user already register" });
    }

    const newRegister = new User({
      name,
      phone,
      cnic,
      issueDate,
      expirydate,
      role,
    });
    await newRegister.save();

    return res
      .status(201)
      .json({ message: "registration successful", newRegister });
  } catch (err) {
    console.error("Register Error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ---------- LOGIN ----------
exports.login = async (req, res) => {
  try {
    const { cnic } = req.body;

    const user = await User.findOne({ cnic });
    if (!user) {
      return res.status(404).json({ message: "User nahi mila!" });
    }

    const accessToken = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id.toString() },
      process.env.REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({ message: "Welcome back!", user, accessToken });
  } catch (err) {
    console.error("Login Error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ---------- REFRESH TOKEN ----------
exports.refresh_token = async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    return res.status(401).json({ message: "no refresh_token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ message: "invalid Token" });
    }

    const newAccessToken = jwt.sign(
      { id: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.cookie("accessToken", newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    return res.json({ message: "token refresh", accessToken: newAccessToken });
  } catch (err) {
    console.error("Refresh Token Error:", err.message);
    return res
      .status(403)
      .json({ message: "Session expired, check back later." });
  }
};

// ---------- GET ALL DATA ----------
exports.getAllData = async (req, res) => {
  try {
    const request = await User.find()
      .select("name phone cnic issueDate expirydate role")
      .sort({ createdAt: -1 });
    return res.json({ request });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};