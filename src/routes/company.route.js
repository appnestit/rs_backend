import { Router } from "express";
import { getCompanyData, updateCompanyData } from "../controllers/company.controller.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const companyRouter = Router()

companyRouter.route("/update").put(superadminVerify, upload.single("logo"), updateCompanyData)
companyRouter.route("/get/data/:typeOfStore").get(getCompanyData)

export {
    companyRouter
}