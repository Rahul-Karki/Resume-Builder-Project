import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken";

const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !password || !email) {
      return res.status(400).json({
        message: "Enter all mandatory fields",
      });
    }

    const check = await User.findOne({ email });

    if (check) {
      return res.status(400).json({
        message: "User already exists",
      });
    }
    
    const saltRounds = 10;

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
    });

    await user.save();

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    res.cookie("refreshToken",refreshToken,
        {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        }
    );

    res.status(201).json({
        accessToken,
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
        }
    });
    // response is send to frontend

  } catch (error) {
    res.status(500).json({
      message: "server error",
    });
  }
};

const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Check email and password again",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Password entered is wrong check again",
      });
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());
    
    res.cookie("refreshToken",refreshToken,
        {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
        }
    );

    res.status(201).json({
        accessToken,
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
        }
    });
    
  } catch (error) {
        res.status(500).json({
        message: "server error",
        });
    }
};



export { registerUser, login };
