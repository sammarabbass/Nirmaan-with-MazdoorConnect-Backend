const express = require("express");
const c = require("../controller/Thekdar.Controller");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// order: protect -> controller. Role check controller ke andar hota hai.
router.post("/profile", protect, c.createProfile);
router.get("/profile", protect, c.getMyProfile);
router.put("/profile", protect, c.updateProfile);

// project ab sirf house owner ki request accept hone par banta hai (createProject nahi)
router.get("/projects", protect, c.listProjects);
router.get("/projects/:id", protect, c.getProject);
router.put("/projects/:id", protect, c.updateProject);
router.delete("/projects/:id", protect, c.deleteProject);
router.get("/projects/:id/finance", protect, c.getProjectFinance);

// house owner ki hire requests
router.get("/requests", protect, c.listRequests);
router.post("/requests/:id/accept", protect, c.acceptRequest);
router.post("/requests/:id/reject", protect, c.rejectRequest);

router.post("/projects/:id/hire", protect, c.hireLabour);
router.get("/projects/:id/hirings", protect, c.listHirings);
router.post("/hirings/:id/release", protect, c.releaseHiring);

router.get("/finance", protect, c.getFinanceSummary);

module.exports = router;
// server file mein: server.use('/api/v4', require('../route/thekedar.route'))