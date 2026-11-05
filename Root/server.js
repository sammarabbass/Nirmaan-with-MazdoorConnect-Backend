require("dotenv").config()
const express=require("express")
const cookieParser=require("cookie-parser")
const connectDB=require("../config/db")
const cors=require("cors")
// const { connectDBsql, pool } = require("../config/sqlDb")
const server=express();
server.set("trust proxy", 1); 
connectDB()
// connectDBsql()
const allowedOrigins = [
  "http://localhost:5173",
  "https://nirmaan-with-mazdoorconnect-frontend-production.up.railway.app",
  "https://nirmaan-with-mazdoorconnect-frontend-production-a31c.up.railway.app",
  "https://nirmaan-with-mazdoorconnect-frontend-production-a31c.up.railway.app/",
  process.env.FRONTEND_URL
];

server.use(
  cors({
    origin: function (origin, callback) {
      // Allow internal tooling requests or local testing configurations (no origin header)
      if (!origin) return callback(null, true);
      
      // Auto-whitelist localhost and any production subdomain containing your app phrase
      if (origin.includes("mazdoorconnect") || origin.includes("localhost")) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS validation mismatch"), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Crucial to allow preflight checks
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200 // Some legacy browsers choke on 204 for preflight checks
  })
);server.use(express.json());

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