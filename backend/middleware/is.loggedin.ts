
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../entities/user.entity";
import { AppDataSource } from "../config/data.source";

interface AuthTokenPayload extends JwtPayload {
  userId: string;
  organizationId?: string;
  role: string;
  type: string;
}

export const isLoggedIn = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authorization = req.headers.authorization;
    const bearerToken = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : undefined;
    const token = bearerToken || req.cookies?.token;

    if (!token || typeof token !== "string") {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
      return;
    }

    // 2. Ensure the JWT secret is configured
    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;

    if (!secret) {
      console.error("ACCESS_TOKEN_SECRET or JWT_SECRET is not configured.");

      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
      return;
    }

    // 3. Verify the JWT signature and expiration
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      decoded.userId.length === 0 ||
      typeof decoded.role !== "string" ||
      decoded.type !== "ACCESS"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    const payload = decoded as AuthTokenPayload;
    const user = await AppDataSource.getRepository(User).findOneBy({
      id: payload.userId,
    });

    if (!user || user.status !== "ACTIVE") {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    req.user = {
      id: user.id,
      organizationId: user.organizationId ?? undefined,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error: unknown) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
      return;
    }

    console.error("Authentication middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
