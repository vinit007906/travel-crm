
import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication required."
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired login session."
    });
  }
}

export function requireCampaignRole(req, res, next) {
  if (!["Admin", "Manager"].includes(req.user?.role)) {
    return res.status(403).json({
      message: "Only Admin or Manager can manage campaigns."
    });
  }

  next();
}
