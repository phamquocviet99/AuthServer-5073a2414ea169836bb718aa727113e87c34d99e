import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const checkAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, process.env.ACCESS_JWT_KEY);
    req.userData = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      message: "Không đủ quyền truy cập",
      code: -1000,
      success: false,
    });
  }
};
export default checkAuth;
