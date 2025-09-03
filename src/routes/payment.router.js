import { Router } from "express";
import { allOrdersStaff, allOrdersSuperadmin, changeDelivaryStatus, checkout, deleteOrderData, generateInvoice, getReferredOrders, getSingleOrderStaff, getSingleOrderUser, myOrders } from "../controllers/payment.controller.js";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { getReferralCode } from "../controllers/user.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";
import { generateDailyReport, generateProductReport, productSellingHistory } from "../controllers/report.controller.js";

const paymentRouter = Router()

paymentRouter.route("/checkout").post(userVerify, checkout)
paymentRouter.route("/my-orders").get(userVerify, myOrders)
paymentRouter.route("/get/single/order/staff/:paymentId").get(staffVerify, getSingleOrderStaff)
paymentRouter.route("/get/single/order/sa/:paymentId").get(superadminVerify, getSingleOrderStaff)
paymentRouter.route("/get/single/order/user/:paymentId").get(userVerify, getSingleOrderUser)
paymentRouter.route("/get/all/orders/staff/:page/:city/:typeOfStore").get(staffVerify, allOrdersStaff)
paymentRouter.route("/get/all/orders/sa/:page/:typeOfStore").get(superadminVerify, allOrdersSuperadmin)
paymentRouter.route("/change/delivary/status/:paymentId/:status").get(staffVerify, changeDelivaryStatus)
paymentRouter.route("/generate/invoice/:paymentId").get(generateInvoice)
paymentRouter.route("/referred/orders/:page/:city/:typeOfStore").get(staffVerify, getReferredOrders)
paymentRouter.route("/get/product/history/:page/:typeOfStore").get(
    superadminVerify, productSellingHistory
)
paymentRouter.route("/order/delete/:orderId").delete(
    superadminVerify, deleteOrderData
)

// reports
paymentRouter.route("/generate/report/:typeOfStore").get(superadminVerify, generateDailyReport)
paymentRouter.route("/generate/product/report").post(superadminVerify, generateProductReport)

export {
    paymentRouter
}