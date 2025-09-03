import { Router } from "express";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";
import { addRelease, deleteRelease, editRelease, getAllRelease, getLatestRelease } from "../controllers/appRelease.controller.js";

const releaseRouter = Router()

releaseRouter.route("/add").post(superadminVerify, addRelease)
releaseRouter.route("/edit").put(superadminVerify, editRelease)
releaseRouter.route("/delete/:releaseId").delete(superadminVerify, deleteRelease)
releaseRouter.route("/get/all").get(superadminVerify, getAllRelease)
releaseRouter.route("/get/latest/release").get(getLatestRelease)

export {
    releaseRouter
}