const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Generate JWT token
const generateToken=(userId)=>{
    return jwt.sign({id:userId},process.env.JWT_SECRET,{expiresIn:"7d"});
};

//Register new user
// Route POST/api/auth/register
// access Public
const registerUser = async(req,res)=>{
    try{
        const { name, email, password, profileImageUrl, adminInviteToken } =
          req.body;

        //check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
          return res.status(400).json({ message: "User already exists." });
        }

        //Determine user role: Admin if correct token is placed, otherwise member
        let role = "member";
        if (
          adminInviteToken &&
          adminInviteToken == process.env.ADMIN_INVITE_TOKEN
        ) {
          role = "admin";
        }

        //Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //Create new user
        const user = await User.create({
          name,
          email,
          password: hashedPassword,
          profileImageUrl,
          role,
        });

        //Return user data with JWT
        res.status(200).json({
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profileImageUrl: user.profileImageUrl,
          token: generateToken(user._id),
        });
    } catch(error){
        res.status(500).json({message:"Server error.",error:error.message})
    }
};

//Login user
// Route POST/api/auth/login
//access public
const loginUser= async(req,res)=>{
    try {
      const{email,password}=req.body;

      const user = await User.findOne({email});
      if(!user){
        return res.status(401).json({message:"Invalid email or password."});
      }

      //compare password
      const isMatch= await bcrypt.compare(password,user.password);
      if(!isMatch){
        return res.status(401).json({ message: "Invalid email or password." });
      }

      //return user data with jwt
      res.json({
        _id:user._id,
        name:user.name,
        email:user.email,
        role:user.role,
        profileImageUrl:user.profileImageUrl,
        token:generateToken(user._id),
      });
    } catch (error) {
      res.status(500).json({ message: "Server error.", error: error.message });
    }
};

//Get user profile
// Route GET/api/auth/profile
//access private (requires JWT)
const getUserProfile=async(req,res)=>{
    try {
      const user = await User.findById(req.user.id).select("-password");
      if(!user){
        return res.status(404).json({message:"User not found."});
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Server error.", error: error.message });
    }
};

// Update user profile
// Route PUT/api/auth/profile
// access private(requires JWT)
const updateUserProfile=async(req,res)=>{
    try {
      const user = await User.findById(req.user.id);

      if(!user){
        return res.status(404).json({message:"User not found."});
      }

      user.name = req.body.name||user.name;
      user.email = req.body.email||user.email;

      if(req.body.password){
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(req.body.password,salt);
      }
      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profileImageUrl: updatedUser.profileImageUrl,
        token: generateToken(updatedUser._id),
      });
    } catch (error) {
      res.status(500).json({ message: "Server error.", error: error.message });
    }
};

module.exports={registerUser,loginUser,getUserProfile,updateUserProfile};