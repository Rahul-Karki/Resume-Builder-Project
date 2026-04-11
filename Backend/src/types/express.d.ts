import "express";
import "passport";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
      name: string;
    }
  }
}