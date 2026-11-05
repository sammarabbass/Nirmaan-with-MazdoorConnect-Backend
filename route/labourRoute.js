const express=require("express")
const { protect } = require("../middleware/authMiddleware")
const { createProfile, getMyProfile, updateProfile, listLabour, getMyRecord } = require('../controller/Labour.controller');
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

// order: protect -> upload -> controller. Role check controller ke andar hota hai.

router.post("/profile", protect, upload.array("attachments", 5), createProfile);
router.get("/profile", protect, getMyProfile);
router.put("/profile", protect, upload.array("attachments", 5), updateProfile);
router.get("/my-record", protect, getMyRecord)
// Thekedar / House owner: mazdoor dhoondo
router.get("/all", protect, listLabour);
module.exports = router;