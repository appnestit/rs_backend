import { Router } from "express";
import { addSuperadmin, generateOtpSuperadmin, getSuperadmin, resetSuperadminPassword, superadminForgotPassword, superadminLogin, superAdminLogout, verifySuperadminOtp } from "../controllers/superadmin.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";
import { getAllStaff } from "../controllers/staff.controller.js";

const superadminRouter = Router()

superadminRouter.route("/cd687423-70dc-4bb2-bc4c-9c1d7a026001/add").post(addSuperadmin)
superadminRouter.route("/login").post(superadminLogin)
superadminRouter.route("/get").get(superadminVerify, getSuperadmin)
superadminRouter.route("/get/all/staff").get(
    superadminVerify, getAllStaff
)
superadminRouter.route("/logout").get(superAdminLogout)

// forgot password
superadminRouter.route("/account/otp/generate").post(generateOtpSuperadmin)
superadminRouter.route("/account/otp/verify").post(verifySuperadminOtp)
superadminRouter.route("/account/forgot-password").post(superadminForgotPassword)

superadminRouter.route("/account/password/reset").post(superadminVerify, resetSuperadminPassword)

export {
    superadminRouter
}