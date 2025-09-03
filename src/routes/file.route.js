import { Router } from "express";
import { getFile } from "../controllers/file.controller.js";

const fileRouter = Router()

fileRouter.route("/get/:file").get(getFile)

export {
    fileRouter
}