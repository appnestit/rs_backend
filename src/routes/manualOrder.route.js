import { Router } from "express";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { addOrder, allOrders, changeStatus } from "../controllers/manualOrder.js";

const manualOrderRouter = Router()

manualOrderRouter.route("/add").post(userVerify, upload.array("manualOrder", 5), addOrder)
manualOrderRouter.route("/get/all/orders/:page/:limit").get(staffVerify, allOrders)
manualOrderRouter.route("/status/change").post(staffVerify, changeStatus)

export {
    manualOrderRouter
}