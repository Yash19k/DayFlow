
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";


import { User } from "../entities/user.entity";
import { AppDataSource } from "../config/data.source";

interface AuthTokenPayload extends JwtPayload {
  userId: string;
}

export const isLoggedIn = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Read the JWT from the cookie
    const token = req.cookies?.token;

    if (!token || typeof token !== "string") {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
      return;
    }

    // 2. Ensure the JWT secret is configured
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is not configured.");

      res.status(500).json({
        success: false,
        message: "Internal server error.",
      });
      return;
    }

    // 3. Verify the JWT signature and expiration
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    // 4. Validate the payload structure
    if (
      typeof decoded === "string" ||
      typeof decoded.userId !== "string" ||
      decoded.userId.length === 0
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
      return;
    }

    const payload = decoded as AuthTokenPayload;

    // 5. Find the user in the database
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOneBy({
      id: payload.userId,
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found. Please log in again.",
      });
      return;
    }

    // 6. Attach the authenticated identity to the request
    req.user = {
      id: user.id,
    };

    // 7. Continue to the next middleware or controller
    next();
  } catch (error: unknown) {
    // Invalid, expired, or malformed JWT
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

    // Unexpected errors, such as database failures
    console.error("Authentication middleware error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};
