import Router from "express"
import { userVerify } from "../middlewares/userVerify.middleware.js"
import { addCoinToUser, applyWithdrawal, createWithdrawal, getAllTransanction, getAllWithdrawal, getTransanctionByIdUser } from "../controllers/walletTransaction.controller.js"
import { staffVerify } from "../middlewares/staff.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js"

const walletTransanctionRouter = Router()

walletTransanctionRouter.route("/coin/add").post(superadminVerify, addCoinToUser)
walletTransanctionRouter.route("/withdrawal/apply").post(userVerify, applyWithdrawal)
walletTransanctionRouter.route("/withdrawal/create").post(superadminVerify, upload.array("supportingDocs", 5), createWithdrawal)
walletTransanctionRouter.route("/get/user/transanctions/:transType").get(userVerify, getTransanctionByIdUser)
walletTransanctionRouter.route("/get/all/withdrawals").get(superadminVerify, getAllWithdrawal)
walletTransanctionRouter.route("/get/all/transanctions").get(superadminVerify, getAllTransanction)

export {
    walletTransanctionRouter
}