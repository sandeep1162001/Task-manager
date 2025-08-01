require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes")
const userRoutes = require("./routes/userRoutes")
const taskRoutes = require("./routes/taskRoutes")
const reportRoutes = require("./routes/reportRoutes")

const app = express();

// middleware to handle CORS
// app.use((req, res, next) => {
//   console.log("Request Origin:", req.headers.origin);
//   next();
// });


app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);


//connect database
connectDB()

//middleware
app.use(express.json());

//Routes
app.use("/api/auth",authRoutes)
app.use("/api/users",userRoutes)
app.use("/api/tasks",taskRoutes)
app.use("/api/reports",reportRoutes)

//Serve upload folder
app.use("/uploads",express.static(path.join(__dirname,"uploads")));

const PORT = process.env.PORT||8000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));