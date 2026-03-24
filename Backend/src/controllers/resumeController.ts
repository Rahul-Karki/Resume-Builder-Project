import { AuthRequest } from "../middleware/authMiddleware";
import { Response } from "express";
import Resume from "../models/Resume";

const getAllResumes = async (req: AuthRequest, res: Response) => {
  try{
    const userId = req.user?.userId;

    if(!userId){
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    const resumes = await Resume.find({user : userId});

    res.status(200).json({
      resumes,
    });

  } catch (error) {
    console.error("getAllResumes error:", error);

    return res.status(500).json({
      message: "Failed to fetch resumes",
    });
  }
}



