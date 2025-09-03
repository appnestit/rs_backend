import { Router } from "express";
import { userAddressValidation, userLoginValidation, userRegisterValidation, userUpdateValidation } from "../middlewares/userAuthValidation.middleware.js";
import { getUser, userLogout, userLogin, userRegister, updateUserProfile, addAddress, editAddress, deleteAddress, getAllUser, forgotPassword, sendNotificationToAll, sendNotificationToSingleUser, getReferralCode, generateOtpUser, verifyUserOtp } from "../controllers/user.controller.js";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const userRouter = Router()

userRouter.route("/generate/otp").post(generateOtpUser)
userRouter.route("/verify/otp").post(verifyUserOtp)
userRouter.route("/register").post(userRegister)
userRouter.route("/update").put(userVerify, upload.single("profileImage"), updateUserProfile)
userRouter.route("/forgot-password").post(forgotPassword)
userRouter.route("/address/add").post(userVerify, addAddress)
userRouter.route("/address/edit").put(userVerify, editAddress)
userRouter.route("/address/delete/:addressId").delete(userVerify, deleteAddress)
userRouter.route("/login").post(userLogin)
userRouter.route("/logout").get(userVerify, userLogout)
userRouter.route("/get/account/data").get(userVerify, getUser)
userRouter.route("/get/all/user/staff/:page").get(staffVerify, getAllUser)
userRouter.route("/get/all/user/sa/:page").get(superadminVerify, getAllUser)
userRouter.route("/notification/send/all").post(staffVerify, sendNotificationToAll)
userRouter.route("/notification/send/single/user").post(staffVerify, sendNotificationToSingleUser)
userRouter.route("/get/refercode").get(userVerify, getReferralCode)

// superadmin
userRouter.route("/notification/send/sa/all").post(superadminVerify, sendNotificationToAll)
userRouter.route("/notification/send/sa/single/user").post(superadminVerify, sendNotificationToSingleUser)

export {
    userRouter
}