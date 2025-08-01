const Task = require("../models/Task");

//Get all tasks(admin:all, user:only assigned tasks)
// route GET/api/tasks/
//access private
const getTasks = async(req,res)=>{
    try{
        const {status}= req.query;
        let filter ={};

        if(status){
            filter.status = status;
        }

        let tasks;

        if(req.user.role==="admin"){
            tasks = await Task.find(filter).populate(
                "assignedTo",
                "name email profileImageUrl"
            );

        }else{
            tasks = await Task.find({...filter,assignedTo:req.user._id}).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
        }

        //Add completed todochecklist count to each task
        tasks = await Promise.all(
            tasks.map(async(task)=>{
                const completedCount = task.todoCheckList.filter(
                    (item)=>item.completed
                ).length;
                return{...task._doc, completedTodoCount:completedCount}
            })
        );

        //Status summary counts
        const allTasks = await Task.countDocuments(
            req.user.role === "admin" ? {} : { assignedTo: req.user._id}
        );

        const pendingTasks = await Task.countDocuments({
            ...filter,
            status:"Pending",
            ...(req.user.role !=="admin" && { assignedTo:req.user._id}),
        });

        const inProgressTasks = await Task.countDocuments({
            ...filter,
            status:"In Progress",
            ...(req.user.role !=="admin" && { assignedTo:req.user._id}),
        });

        const completedTasks = await Task.countDocuments({
            ...filter,
            status:"Completed",
            ...(req.user.role !=="admin" && { assignedTo:req.user._id}),
        });

        res.json({
            tasks,
            statusSummary:{
                all:allTasks,
                pendingTasks,
                inProgressTasks,
                completedTasks
            }
        });
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

//Get task by id
// route GET/api/tasks/:id
// access private
const getTaskById = async (req,res)=>{
    try{
        const task = await Task.findById(req.params.id).populate(
            "assignedTo",
            "name email profileImageUrl"
        );
        if(!task) return res.status(404).json({message:"Task not found."});
        res.json(task);
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

//Create new task (admin Only)
//route POST/api/tasks/
//acess private(admin)
const createTask = async(req,res)=>{
    try{
        const{
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            attachments,
            todoCheckList,
        }=req.body;
        if(!Array.isArray(assignedTo)){
            return res.status(400).json({message:"assignedTo must be an Array of user IDs"});
        }
        const task = await Task.create({
            title,
            description,
            priority,
            dueDate,
            assignedTo,
            createdBy:req.user._id,
            todoCheckList,
            attachments,
        });
        res.status(201).json({message:"Task created successfully",task})
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

// Update task details 
//route PUT/api/tasks/:id
//access private
const updateTask= async(req,res)=>{
    try{
        const task = await Task.findById(req.params.id);

        if(!task) return res.status(404).json({message:"Task not found."});

        task.title = req.body.title || task.title;
        task.description = req.body.description || task.description;
        task.priority = req.body.priority || task.priority;
        task.dueDate = req.body.dueDate || task.dueDate;
        task.todoCheckList = req.body.todoCheckList || task.todoCheckList;
        task.attachments = req.body.attachments || task.attachments;

        if(req.body.assignedTo){
            if(!Array.isArray(req.body.assignedTo)){
                return res.status(400).json({message:"assignedTo must be an array of user IDS."})
            }
            task.assignedTo = req.body.assignedTo;
        }

        const updateTask = await task.save();
        res.json({message:"Task updated successfully.",updateTask});
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

// delete task details 
//route DELETE/api/tasks/:id
//access private(admin)
const deleteTask= async(req,res)=>{
    try{
        const task = await Task.findById(req.params.id);

        if(!task) return res.status(404).json({message:
            "Task not found."
        })

        await task.deleteOne();
        res.json({message:"Task deleted successfully."})
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

// Update task status 
//route PUT/api/tasks/:id/status
//access private
const updateTaskStatus= async(req,res)=>{
    try{
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: "Task not found." });

        const isAssigned = task.assignedTo.some((userId)=>userId.toString()=== req.user._id.toString());

        if(!isAssigned && req.user.role !=="admin"){
            return res.status(403).json({message:"Not authorized."});
        }

        task.status = req.body.status || task.status;

        if(task.status==="Completed"){
            task.todoCheckList.forEach((item)=>(item.completed=true));
            task.progress =100;
        }
        await task.save();
        res.json({message:"Task status updated",task})
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

// Update task checklist
//route PUT/api/tasks/:id/todo
//access private
const UpdateTaskCheckList= async(req,res)=>{
    try{
        const {todoCheckList}= req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: "Task not found." });

        if(!task.assignedTo.includes(req.user._id) && req.user.role !=="admin"){
            return res.status(403).json({message:"Not authorized to updated the checklist."})
        }

        task.todoCheckList = todoCheckList //Replace with updated checklist.

        //Auto-update progress based on the checklist completion
        const completedCount = task.todoCheckList.filter((item)=>item.completed).length;
        const totalItems = task.todoCheckList.length;
        task.progress = 
            totalItems>0?Math.round((completedCount/totalItems)*100): 0;

            //Auto-mark as completed if all items are checked
            if(task.progress===100){
                task.status="Completed";
            }else if(!task.progress>0){
                task.status="In Progress";
            }else{
                task.status="Pending";
            }

            await task.save();
            const updateTask = await Task.findById(req.params.id).populate(
                "assignedTo",
                "name email profileImageUrl"
            );
            res.json({message:"Task checklist updated.",task:updateTask})
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

// Dashboard Data(adminOnly)
//route GET/api/tasks/dashboard-data
//access private
const getDashboardData = async (req, res) => {
  try {
    const totalTasks = await Task.countDocuments();
    const pendingTasks = await Task.countDocuments({ status: "Pending" });
    const completedTasks = await Task.countDocuments({ status: "Completed" });
    const overDueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    });

    const taskStatus = ["Pending", "In Progress", "Completed"];
    const taskDistributionFlow = await Task.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const taskDistribution = taskStatus.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "");
      acc[formattedKey] =
        taskDistributionFlow.find((item) => item._id === status)?.count || 0;
      return acc;
    }, {});
    taskDistribution["All"] = totalTasks;

    const taskPriorities = ["Low", "Medium", "High"];
    const taskPriorityLevelsRaw = await Task.aggregate([
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]);
    const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelsRaw.find((item) => item._id === priority)?.count || 0;
      return acc;
    }, {});

    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt");

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overDueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevels,
      },
      recentTasks,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// Dashboard Data(user-specific)
//route GET/api/tasks/user-dashboard-data
//access private
const getUserDashboardData= async(req,res)=>{
    try{
        const userId= req.user._id; // Only fetch data for the logged in user

        //Fetch statistics for user-specific tasks
        const totalTasks = await Task.countDocuments({assignedTo:userId});
        const pendingTasks = await Task.countDocuments({assignedTo:userId, status: "Pending" });
        const completedTasks = await Task.countDocuments({assignedTo:userId,
          status: "Completed",
        });
        const overDueTasks = await Task.countDocuments({
        assignedTo:userId,
          status: { $ne: "Completed" },
          dueDate: { $lt: new Date() },
        });

        //Task distribution by status
        const taskStatus = ["Pending", "In Progress", "Completed"];
        const taskDistributionFlow = await Task.aggregate([
            {$match:{assignedTo:userId}},
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]);

        const taskDistribution = taskStatus.reduce((acc, status) => {
          const formattedKey = status.replace(/\s+/g, "");
          acc[formattedKey] =
            taskDistributionFlow.find((item) => item._id === status)?.count ||
            0;
          return acc;
        }, {});
        taskDistribution["All"] = totalTasks;

        //Task distribution by priority
        const taskPriorities = ["Low", "Medium", "High"];
        const taskPriorityLevelsRaw = await Task.aggregate([
            {$match:{assignedTo:userId}},
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]);
        const taskPriorityLevels = taskPriorities.reduce((acc, priority) => {
          acc[priority] =
            taskPriorityLevelsRaw.find((item) => item._id === priority)
              ?.count || 0;
          return acc;
        }, {});

        //Fetch recent 10 tasks
        const recentTasks = await Task.find({assignedTo:userId})
          .sort({ createdAt: -1 })
          .limit(10)
          .select("title status priority dueDate createdAt");

        res.status(200).json({
          statistics: {
            totalTasks,
            pendingTasks,
            completedTasks,
            overDueTasks,
          },
          charts: {
            taskDistribution,
            taskPriorityLevels,
          },
          recentTasks,
        });
    }
    catch(error){
        res.status(500).json({message:"Server error",error:error.message});
    }
};

module.exports ={
    getTasks,
    getTaskById,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    UpdateTaskCheckList,
    getDashboardData,
    getUserDashboardData
}



