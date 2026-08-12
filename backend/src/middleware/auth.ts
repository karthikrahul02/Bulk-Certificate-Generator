import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { HttpError } from "../utils/http.js";

export type AuthUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
};

export type AuthRequest = Request & { user: AuthUser };

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new HttpError(401, "Authentication required"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    (req as AuthRequest).user = payload as AuthUser;
    return next();
  } catch {
    return next(new HttpError(401, "Invalid or expired token"));
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as AuthRequest).user;
    if (!roles.includes(user.role)) {
      return next(new HttpError(403, "You do not have permission for this action"));
    }
    return next();
  };
}
