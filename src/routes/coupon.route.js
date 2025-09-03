import {Router} from "express"
import { addCoupon, checkCoupon, checkReferralCode, deleteCoupon, editCoupon, getAllCouponByAdmin, getAllCouponByStaff, getCouponsClient } from "../controllers/coupon.controller.js"
import { staffVerify } from "../middlewares/staff.middleware.js"
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js"

const couponRouter = Router()

couponRouter.route("/add").post(superadminVerify, addCoupon)
couponRouter.route("/delete/:id").delete(superadminVerify, deleteCoupon)
couponRouter.route("/edit").put(superadminVerify, editCoupon)

//fetch API
couponRouter.route("/admin/get/all").get(superadminVerify, getAllCouponByAdmin)
couponRouter.route("/staff/get/all").get(staffVerify, getAllCouponByStaff)
couponRouter.route("/get/single/:coupon/:typeOfStore").get(checkCoupon)
couponRouter.route("/user/get/all/:typeOfStore").get(getCouponsClient)
couponRouter.route("/check/refer/:referCode").get(checkReferralCode)

export {couponRouter}