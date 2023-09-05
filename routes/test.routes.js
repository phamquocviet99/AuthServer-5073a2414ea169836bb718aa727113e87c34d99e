import express from "express";
const router = express.Router();
import checkAuth from "../middleware/check-auth.js";
function waitOneSecondAndReturnResult(result, res) {
  new Promise((resolve) => {
    setTimeout(() => {
      resolve(result);
    }, 1000); // 1000 milliseconds = 1 second
  }).then(() => {
    return res.status(200).json({
      message: "Gút",
      code: 200,
      success: true,
    });
  });
}
router.post("/", checkAuth, waitOneSecondAndReturnResult);

export default router;
