require("dotenv").config()
const express=require("express")
const cookieParser=require("cookie-parser")
const connectDB=require("../config/db")
const cors=require("cors")
// const { connectDBsql, pool } = require("../config/sqlDb")
const server=express();
connectDB()
// connectDBsql()
const allowedOrigins = [
  "http://localhost:5173",
  "https://nirmaan-with-mazdoorconnect-frontend-production.up.railway.app",
  "https://nirmaan-with-mazdoorconnect-frontend-production-a31c.up.railway.app",
  "https://nirmaan-with-mazdoorconnect-frontend-production-a31c.up.railway.app/",
  process.env.FRONTEND_URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow internal requests or tooling like Postman
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS policy violation"), false);
    }
  },
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