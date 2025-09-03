import { Router } from "express";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";
import { addStaff, changeShopStatus, checkShopStatusbyCity, generateOtpStaff, getAllStaff, getStaff, staffChangePassword, staffForgotPassword, staffLogin, staffLogout, updateProductActiveByStaff, updateStaffProfile, verifyStaffOtp } from "../controllers/staff.controller.js";
import { staffVerify } from "../middlewares/staff.middleware.js";

const staffRouter = Router()

staffRouter.route("/add").post(superadminVerify, addStaff)
staffRouter.route("/login").post(staffLogin)
staffRouter.route("/get").get(staffVerify, getStaff)
staffRouter.route("/password/change").post(staffVerify, staffChangePassword)
staffRouter.route("/update/product/availability").put(staffVerify, updateProductActiveByStaff)
staffRouter.route("/get/all/staff/sa/:typeOfStore").get(superadminVerify, getAllStaff)
staffRouter.route("/shop/status/change").post(staffVerify, changeShopStatus)
staffRouter.route("/shop/status/check/:city/:typeOfStore").get(checkShopStatusbyCity)
staffRouter.route("/edit/sa").post(superadminVerify, updateStaffProfile)
staffRouter.route("/logout").get(staffLogout)

// forgot password
staffRouter.route("/account/otp/generate").post(generateOtpStaff)
staffRouter.route("/account/otp/verify").post(verifyStaffOtp)
staffRouter.route("/account/forgot-password").post(staffForgotPassword)

export {
    staffRouter
}