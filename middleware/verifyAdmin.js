// server/middleware/verifyAdmin.js
import { getAuth } from "firebase-admin/auth";

export const verifyAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : null;

  if (!token) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    if (decoded.isAdmin) {
      req.user = decoded;
      next();
    } else {
      return res.status(403).json({ error: "Not an admin" });
    }
  } catch (err) {
    console.error("Auth verification failed:", err);
    return res.status(403).json({ error: "Token verification failed" });
  }
};
