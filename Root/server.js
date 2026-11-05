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
  "http://localhost:3000",
  process.env.FRONTEND_URL
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

server.use(cors(corsOptions));   // bas ye ek line kaafi hai
server.use(cors(corsOptions));
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