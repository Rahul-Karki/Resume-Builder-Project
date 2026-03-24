import { Request, Response } from "express";
import Resume from "../models/Resume";

const getAllResumes = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    const resumes = await Resume.find({ userId });

    res.status(200).json(resumes);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fettch resumes",
    });
  }
};




export { getAllResumes }