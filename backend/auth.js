
import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    console.error("Authentication configuration error: JWT_SECRET is missing or too short.");

    return res.status(500).json({
      message: "Server authentication is not configured correctly."
    });
  }

  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  const token = header.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      message: "Authentication token is missing."
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: "sameel-distribution",
      algorithms: ["HS256"]
    });

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.id ||
      !decoded.username ||
      !["admin", "manager", "booker"].includes(decoded.role)
    ) {
      return res.status(401).json({
        message: "Invalid authentication token."
      });
    }

    req.user = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
      name: decoded.name || decoded.fullName || ""
    };

    return next();
  } catch (error) {
    console.error("AUTH ERROR:", error.message);

    return res.status(401).json({
      message: "Invalid or expired authentication token."
    });
  }
}

export function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentication required."
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "You do not have permission to perform this action."
      });
    }

    return next();
  };
}
