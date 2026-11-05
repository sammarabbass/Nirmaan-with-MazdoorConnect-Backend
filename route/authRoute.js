const express=require("express")
const { protect, isAdmin } = require("../middleware/authMiddleware")
const route=express.Router()
const { register, login, getAllData } = require("../controller/authController")

route.post('/register',register)
route.post("/login",login)
route.get("/AllData",protect,isAdmin,getAllData)

module.exports=route