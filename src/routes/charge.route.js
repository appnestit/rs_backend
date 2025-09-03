import { Router } from "express";
import { addCharge, deleteCharge, getChargesAdmin, getChargesByStaff, getChargesClient, updateCharge } from "../controllers/charges.controller.js";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const chargeRouter = Router()

chargeRouter.route("/add").post(superadminVerify, addCharge)
chargeRouter.route("/update").put(superadminVerify, updateCharge)
chargeRouter.route("/delete/:id").delete(superadminVerify, deleteCharge)

//fetch APIs
chargeRouter.route("/admin/get/all").get(superadminVerify, getChargesAdmin)
chargeRouter.route("/user/get/all/:typeOfStore").get(userVerify, getChargesClient)
chargeRouter.route("/staff/get/all").get(staffVerify, getChargesByStaff)

export {chargeRouter}