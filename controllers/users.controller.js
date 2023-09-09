import userModel from "../models/users.model.js";
import tokenAuthModel from "../models/token.auth.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import validator from "validator";
import { nanoid } from "nanoid";

dotenv.config();

export const register = async (req, res, next) => {
  if (!req.body.email) {
    return res.status(400).send({
      success: false,
      code: -1,
      message: "Email là bắt buộc !",
    });
  }
  if (!req.body.password) {
    return res.status(400).send({
      success: false,
      code: -1,
      message: "Password là bắt buộc !",
    });
  }
  if (!req.body.fullName) {
    return res.status(400).send({
      success: false,
      code: -1,
      message: "Fullname là bắt buộc !",
    });
  }
  if (!validator.isEmail(req.body.email)) {
    return res.status(400).send({
      success: false,
      code: -1,
      message: "Email không hợp lệ !",
    });
  }
  userModel
    .find({
      email: req.body.email,
    })
    .exec()
    .then((user) => {
      if (user.length >= 1) {
        return res.clearCookie("refreshToken").status(409).json({
          success: false,
          message: "Email đã có người sử dụng",
        });
      } else {
        bcrypt.hash(req.body.password, 10, (err, hash) => {
          if (err) {
            return res.clearCookie("refreshToken").status(500).json({
              success: false,
              code: -100,
              message: "Có lỗi khi tạo người dùng",
            });
          } else {
            const user = new userModel({
              _id: nanoid(),
              email: req.body.email,
              fullName: req.body.fullName,
              password: hash,
            });
            user
              .save()
              .then((result) => {
                return res.status(200).json({
                  success: true,
                  code: 0,
                  message: "Tạo người dùng thành công",
                  data: {
                    id: result._id,
                    email: result.email,
                    fullName: result.fullName,
                    role: result.roles,
                  },
                });
              })
              .catch((err) => {
                return res.status(500).json({
                  error: true,
                  success: false,
                  code: -100,
                });
              });
          }
        });
      }
    });
};
export const login = async (req, res) => {
  userModel
    .find({ email: req.body.email })
    .exec()
    .then((user) => {
      if (user.length < 1) {
        return res.clearCookie("refreshToken").status(404).json({
          success: false,
          message: "Tài khoản không tồn tại !",
        });
      }
      bcrypt.compare(
        req.body.password,
        user[0].password,
        async (err, result) => {
          if (err) {
            return res.clearCookie("refreshToken").status(401).json({
              success: false,
              code: 401,
              message: "Sai mật khẩu",
            });
          }
          if (result) {
            const accessToken = jwt.sign(
              { e: user[0].email, uid: user[0]._id, role: user[0].roles },
              process.env.ACCESS_JWT_KEY,
              {
                expiresIn: "30s",
              }
            );
            const refreshToken = nanoid();
            const newRefreshToken = new tokenAuthModel({
              _id: refreshToken,
              uid: user[0]._id,
              nodeRoot: null,
            });
            await newRefreshToken.save();
            return res
              .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                sameSite: "None",
                maxAge: 7 * 24 * 60 * 60 * 1000,
              })
              .status(200)
              .json({
                success: true,
                code: 0,
                message: "Đăng nhập thành công",
                data: {
                  id: user[0]._id,
                  email: user[0].email,
                  role: user[0].roles,
                  token: accessToken,
                },
              });
          }
          return res.clearCookie("refreshToken").status(401).json({
            success: false,
            code: -100,
            message: "Sai mật khẩu",
          });
        }
      );
    })
    .catch((err) => {
      return res.clearCookie("refreshToken").status(500).json({
        error: err,
        success: false,
      });
    });
};

export const refresh = async (req, res) => {
  var cookie = getRefreshToken(req.headers.cookie);
  if (!cookie) {
    return res.status(401).json({
      message: "Không đủ quyền truy cập",
      code: 4011,
      success: false,
    });
  }
  let tokenAuth = await tokenAuthModel.findById({ _id: cookie });
  if (tokenAuth === null || isTargetDatePast(tokenAuth.timeCreated)) {
    return res.clearCookie("refreshToken").status(401).json({
      message: "Không đủ quyền truy cập",
      code: 4012,
      success: false,
    });
  }
  if (!tokenAuth.isActive) {
    await tokenAuthModel
      .deleteMany({
        nodeRoot: tokenAuth.nodeRoot,
      })
      .then((result) => {
        console.log(result);
        return res.status(401).json({
          message: "Không đủ quyền truy cập- old-rt",
          code: 4013,
          success: false,
        });
      })
      .catch((err) => {
        console.error("Loiôiỗi;");
        return res.status(401).json({
          message: "Lỗi",
          code: 4014,
          success: false,
        });
      });
  } else {
    console.log("toiơiới dayt");
    const user = await userModel.findById({ _id: tokenAuth.uid });
    tokenAuth.isActive = false;

    await tokenAuth
      .save()
      .catch((err) => {
        return res.status(500).json({
          message: "Có lỗi khi cập nhật DB",
          code: 500,
          success: false,
        });
      })
      .then((e) => {
        console.log(e);
      });

    const accessToken = jwt.sign(
      { e: user.email, uid: user._id, role: user.roles },
      process.env.ACCESS_JWT_KEY,
      {
        expiresIn: "30s",
      }
    );
    const token = nanoid();

    const newRefreshToken = new tokenAuthModel({
      _id: token,
      uid: user._id,
      nodeRoot:
        tokenAuth.nodeRoot === null ? tokenAuth._id : tokenAuth.nodeRoot,
    });

    newRefreshToken
      .save()
      .then(() => {
        return res
          .cookie("refreshToken", token, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 7 * 24 * 60 * 60 * 1000,
          })
          .status(200)
          .json({
            success: true,
            code: 0,
            data: {
              id: user._id,
              email: user.email,
              role: user.roles,
              token: accessToken,
            },
          });
      })
      .catch((error) => {
        console.log("------");
        return res.status(401).json({
          message: error,
          code: 4016,
          success: false,
        });
      });
  }
};

function isTargetDatePast(targetDateString) {
  const targetDate = new Date(targetDateString);
  const currentDate = new Date();
  return targetDate < currentDate;
}

function getRefreshToken(g_state) {
  if (!g_state) return undefined;
  // Tách các phần tử trong chuỗi thành các phần tử riêng biệt
  const elements = g_state.split(";");

  // Tìm phần tử chứa refreshToken
  let refresh_token_element = null;
  for (const element of elements) {
    if (element.includes("refreshToken=")) {
      refresh_token_element = element.trim();
      break;
    }
  }

  // Lấy giá trị của refreshToken
  const refresh_token = refresh_token_element
    ? refresh_token_element.split("=")[1]
    : null;

  return refresh_token;
}

export const logout = async (req, res) => {
  try {
    var cookie = getRefreshToken(req.headers.cookie);
    if (!cookie) {
      return res.res.clearCookie("refreshToken").status(401).json({
        success: true,
      });
    }
    let tokenAuth = await tokenAuthModel.findById({ _id: cookie });
    if (tokenAuth === null || isTargetDatePast(tokenAuth.timeCreated)) {
      return res.res.clearCookie("refreshToken").status(200).json({
        success: true,
      });
    }
    if (tokenAuth.nodeRoot === null) {
      await tokenAuthModel
        .findByIdAndDelete({ _id: cookie })
        .then((result) => {
          return res.clearCookie("refreshToken").status(200).json({
            success: false,
            code: 200,
            message: "ok",
          });
        })
        .catch((error) => {
          return res.status(500).json({
            message: "Server Error",
            code: 500,
            success: false,
          });
        });
    } else {
      await tokenAuthModel
        .deleteMany({
          nodeRoot: tokenAuth.nodeRoot,
        })
        .then((result) => {
          return res.clearCookie("refreshToken").status(200).json({
            success: true,
            code: 200,
            message: "ok",
          });
        })
        .catch((err) => {
          return res.status(500).json({
            message: "Server Error",
            code: 500,
            success: false,
          });
        });
    }
  } catch (error) {
    return res.status(500).json({
      message: "Server Error",
      code: 500,
      success: false,
    });
  }
};
