import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      role: string;
      name: string;
      email?: string;
    }
  }
}