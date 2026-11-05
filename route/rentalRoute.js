const express=require("express")
const { protect, isAdmin } = require("../middleware/authMiddleware")
const { uploadTools, updateStatus, getmytools, updatetools, tools, deletetools, getalltools, getAllRequests } = require("../controller/rentalController")
const upload = require("../middleware/uploadMiddleware")
const supplie=express.Router()

supplie.post("/create",protect,upload.array("attachments", 5),uploadTools)
supplie.get("/my",protect,getmytools)
supplie.put("/updateStatus/:id",protect,isAdmin,updateStatus)
supplie.put("/:id", protect, updatetools);
supplie.get("/:id", protect, tools);
supplie.delete("/:id",protect,deletetools)
supplie.get("/",protect,isAdmin,getalltools)

module.exports=supplie