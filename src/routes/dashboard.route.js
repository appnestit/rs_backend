import { Router } from "express";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { dashboardData, todayOrderData } from "../controllers/dashboard.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const dashboardRouter = Router()

dashboardRouter.route("/get/data/all").get(staffVerify, dashboardData)
dashboardRouter.route("/get/today/order").get(staffVerify, todayOrderData)

// superadmin
dashboardRouter.route("/get/data/all/sa").get(superadminVerify, dashboardData)

export {
    dashboardRouter
}