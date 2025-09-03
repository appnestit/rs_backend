import { Router } from "express";
import { addContact, getAllMsg } from "../controllers/contact.controller.js";

const contactRouter = Router()

contactRouter.route("/add").post(addContact)
contactRouter.route("/get/all").get(getAllMsg)

export {
    contactRouter
}