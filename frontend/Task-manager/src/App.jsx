import React, { useContext } from 'react'
import{
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate
} from "react-router-dom";
import Dashboard from './pages/Admin/Dashboard';
import Login from './pages/Auth/Login';
import SignUp from './pages/Auth/SignUp';
import ManageTasks from './pages/Admin/ManageTasks';
import CreateTask from './pages/Admin/CreateTask';
import ManageUsers from './pages/Admin/ManageUsers';
import UserDashboard from './pages/User/UserDashboard';
import MyTask from './pages/User/MyTask';
import ViewTaskDetails from './pages/User/ViewTaskDetails';
import PrivateRoute from './routes/PrivateRoute';
import UserProvider, { UserContext } from './context/userContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <UserProvider>
    <div>
      <Router>
        <Routes>
          <Route path='/login' element={<Login/>}/>
          <Route path='/signUp' element={<SignUp/>}/>
          {/* Admin routes */}
          <Route element={<PrivateRoute allowedRoles={["admin"]}/>} />
            <Route path='/admin/dashboard' element={<Dashboard/>} />
            <Route path='/admin/tasks' element={<ManageTasks/>} />
            <Route path='/admin/create-task' element={<CreateTask/>} />
            <Route path='/admin/users' element={<ManageUsers/>} />

          {/* user routes */}
          <Route element={<PrivateRoute allowedRoles={["admin"]}/>} />
            <Route path='/user/dashboard' element={<UserDashboard/>} />
            <Route path='/user/tasks' element={<MyTask/>} />
            <Route path='/user/task-details/:id' element={<ViewTaskDetails/>} />

          {/*Default route*/}
          <Route path='/' element={<Root/>}/>

        </Routes>
      </Router>
    </div>
    <Toaster
      toastOptions={{
        className:'',
        style:{
          fontSize:"13px"
        }
      }}
      />
    </UserProvider>
  )
}

export default App

const Root =()=>{
  const {user,loading}=useContext(UserContext);
  if(loading) return<Outlet/>
  if(!user){
    return <Navigate to="/login"/>
  }
  return user.role==="admin"?<Navigate to="/admin/dashboard"/>:<Navigate to="/user/dashboard"/>
}