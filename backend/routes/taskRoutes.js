const express = require("express");
const {protect,adminOnly} = require("../middlewares/authMiddleware");
const { getDashboardData, getUserDashboardData, getTasks, getTaskById, createTask, updateTask, deleteTask, updateTaskStatus, UpdateTaskCheckList } = require("../controllers/taskController");

const router = express.Router();

//Task Managment Routes
router.get("/dashboard-data",protect,getDashboardData);
router.get("/user-dashboard-data",protect,getUserDashboardData);
router.get("/",protect,getTasks); //Get all tasks (Admin:all, user:assigned)
router.get("/:id",protect,getTaskById)
router.post("/",protect,adminOnly,createTask);
router.put("/:id",protect,updateTask);
router.delete("/:id",protect,adminOnly,deleteTask);
router.put("/:id/status",protect,updateTaskStatus);
router.put("/:id/todo",protect,UpdateTaskCheckList);

module.exports = router;