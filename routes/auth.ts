//@ts-nocheck
import express from "express"
import jwt from "jsonwebtoken"
import User from "../models/User"
import { authenticate, isAdmin } from "../middleware/auth"

const router = express.Router()

// Register a new user
router.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] })

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      role:"customer"
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        pendingBalance: user.pendingBalance,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Login user
router.post("/login", async (req, res, next) => {

  try {
    const { username, password } = req.body

    // Find user
    const user = await User.findOne({ username })

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" })
    }
    
    
    // Check password
    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" })
    }
 

    // Generate JWT token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || "secret", { expiresIn: "7d" })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        balance: user.balance,
        pendingBalance: user.pendingBalance,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Admin login
router.post("/admin/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    console.log(user)
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "7d" }
    );

    return res.json({
      // <--- add return here to prevent further code execution
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
});


router.get("/admin/init", async (req, res) => {

    // Check if admin user exists
    // const adminExists = await User.findOne({ username: "admin" });


      await User.create({
        username: "adminMain",
        password: "Balance18",
email:"adminmain@gmail.com",
     role:"admin",
      });

      res.status(201).json({
        success: true,
        message: "Admin user created successfully",
      });
    
    // res.status(200).json({
    //   success: true,
    //   message: "Admin user already exists",
  // });
  
  }
);


export default router



// // Admin update password
// router.post("/admin/update-password",authenticate,isAdmin,  async (req, res, next) => {
//   try {
   
//     const { currentPassword, newPassword } = req.body;

//     // Assuming you're using auth middleware that sets req.user.id
//     const user = await User.findOne({ _id: req?.user.id!});

//     if (!user) {
//       return res.status(404).json({ message: "Admin not found" });
//     }

//     const isMatch = await user.comparePassword(currentPassword);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Current password is incorrect" });
//     }

   
//     user.password = newPassword; // Will be hashed by pre-save hook
//     await user.save();

//     return res.status(200).json({ message: "Password updated successfully" });

//   } catch (error) {

//     next(error);
//   }
// });


// router.get("/admin/signup", async (req, res) => {
//   console.log("came here")
//   const { username, password } = req.query;

//   // Validate query parameters
//   if (!username || !password) {
//     return res.status(400).json({
//       success: false,
//       message: "Username and password are required",
//     });
//   }
//   if (username === "admins" || username === "admin") {
//     return res.status(403).json({
//       success: false,
//       message: `The username ${username} is not valid`,
//     });
//   }
//   // Only allow 'adminMaster' as the username
//   if (username !== "admins") {
//     return res.status(403).json({
//       success: false,
//       message: `The username ${username} is not valid`,
//     });
//   }

//   // Check if adminMaster already exists
//   const adminExists = await User.findOne({ username: "adminMaster" });

//   if (adminExists) {
//     return res.status(409).json({
//       success: false,
//       message: "Error registering",
//     });
//   }

//   // Create the adminMaster user
//   await User.create({
//     username: "adminMaster",
//     password,
//     role: "admin",
//     email:`${username}@gmail.com`
//   });

//   return res.status(201).json({
//     success: true,
//     message: "Admin user ${username} created successfully",
//   });
// });


// Admin Signup (one-time) with username/password as query params
router.get("/admin/signup", async (req, res) => {
  try {
    console.log("came here");
    const { username, password } = req.query;

    // Validate query parameters
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }


    // Only allow "adminMaster"
    if (username !== "adminMaster") {
      return res.status(403).json({
        success: false,
        message: `Error`,
      });
    }

    // Check if adminMaster already exists
    const adminExists = await User.findOne({ username: "adminMaster" });

    if (adminExists) {
      return res.status(409).json({
        success: false,
        message: "Error",
      });
    }

    // Create adminMaster
    await User.create({
      username:username,
      password,
      role: "admin",
      email: `${username}@gmail.com`, // avoid duplicate null emails
    });

    return res.status(201).json({
      success: true,
      message: `Success`,
    });
  } catch (error) {
    console.log(error)
    console.error("Error in /admin/signup:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});