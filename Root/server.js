require("dotenv").config()
const express=require("express")
const cookieParser=require("cookie-parser")
const connectDB=require("../config/db")
const cors=require("cors")
// const { connectDBsql, pool } = require("../config/sqlDb")
const server=express();
connectDB()
const allowedOrigins = [
  "http://localhost:5173", // Keep this for local development
  "https://nirmaan-with-mazdoorconnect-frontend-production.up.railway.app" ,// Add your production frontend
    process.env.FRONTEND_URL
];
// connectDBsql()
server.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
server.use(express.json());

server.use(cookieParser())






server.use('/api',require('../route/authRoute'))
server.use('/api/v1',require('../route/rentalRoute'))
server.use('/api/v2',require('../route/Onwer.Route'))
server.use("/api/v3",require("../route/labourRoute"))
server.use("/api/v4",require("../route/thekedar.Route"))
server.use("/api/v5", require("../route/rentRoute"));
server.use("/api/admin", require("../route/adminRoute"));
server.use("/api/v6", require("../route/rentOnwerRoute"));
server.get("/",(req,res)=>{
    res.send("ha kam hogay")
})

module.exports=server