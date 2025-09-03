import { Router } from "express";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { addPincode, checkPincode, deletePincode, getAllPincodeByAdmin, getAllPincodeBySuperadmin, updatePincode } from "../controllers/pincode.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const pincodeRouter = Router()

pincodeRouter.route("/add").post(staffVerify, addPincode)
pincodeRouter.route("/edit").put(staffVerify, updatePincode)
pincodeRouter.route("/delete/:pincodeId").delete(staffVerify, deletePincode)

// fetch APIs 
pincodeRouter.route("/get/all/sa").get(superadminVerify, getAllPincodeBySuperadmin)
pincodeRouter.route("/get/all/city").get(staffVerify, getAllPincodeByAdmin)
pincodeRouter.route("/check/pincode/:pincode").get(checkPincode)

export {
    pincodeRouter
}