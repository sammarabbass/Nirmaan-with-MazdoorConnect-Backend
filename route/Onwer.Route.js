const express=require('express')
const { createPost, updateStatuss, deletePost, getMyPosts, listThekedars, getThekedar, sendRequest, myRequests, cancelRequest } = require('../controller/HouseOwnController')
const { protect, isAdmin } = require('../middleware/authMiddleware')
const upload = require('../middleware/uploadMiddleware')


const router=express.Router()

router.post('/post',protect,upload.array("attachments", 5),createPost,)
router.get("/my", protect, getMyPosts);
router.put('/update/:id',protect,updateStatuss)
router.delete("/deleted/:id",protect,deletePost)
router.get("/thekedars",protect,listThekedars)
router.get("/thekedar/:id",protect,getThekedar)
router.post("/hire-request",protect,sendRequest)
router.get("/hire-request",protect,myRequests)
router.delete("/hire-request/:id/cancel",protect,cancelRequest)
module.exports=router