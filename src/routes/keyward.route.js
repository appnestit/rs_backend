import { Router } from "express";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { addKeyward, deleteKeyward, getAllKeyward, getKeywardsWithProducts, getSingleKeyward, updateKeyward } from "../controllers/keyward.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const keywardRouter = Router()

keywardRouter.route("/add").post(superadminVerify, addKeyward)
keywardRouter.route("/edit").put(superadminVerify, updateKeyward)
keywardRouter.route("/delete/:keywardId").delete(superadminVerify, deleteKeyward)

// fetch APIs 
keywardRouter.route("/get/all/:typeOfStore").get(getAllKeyward)
keywardRouter.route("/get/all/products/:typeOfStore/:limit").get(getKeywardsWithProducts)
keywardRouter.route("/get/single/keyward/:keywardId/:limit").get(getSingleKeyward)

export {
    keywardRouter
}