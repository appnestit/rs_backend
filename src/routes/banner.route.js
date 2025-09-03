import { Router } from "express";
import { addBanner, deleteBanner, getBanners } from "../controllers/banner.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const bannerRouter = Router()

bannerRouter.route("/add").post(superadminVerify, upload.single("bannerImg"), addBanner)
bannerRouter.route("/delete/:id").delete(superadminVerify, deleteBanner)

//fetch API
bannerRouter.route("/all").get(getBanners)

export {bannerRouter}