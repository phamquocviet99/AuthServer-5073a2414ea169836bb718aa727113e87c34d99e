import express from "express";
import { register, refresh, login } from "../controllers/users.controller.js";
// import checkAuth from "../middleware/check-auth.js";

const router = express.Router();

router.post("/register", register);
router.post("/refresh-token", refresh);
router.post("/login", login);


export default router;
