import { Router } from "express";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { addToCart, editQuantity, getAllCartItems, getSingleCartItem, removeFromCart } from "../controllers/cart.controller.js";

const cartRouter = Router()

cartRouter.route("/add").post(userVerify, addToCart)
cartRouter.route("/remove/:itemId").delete(userVerify, removeFromCart)
cartRouter.route("/quantity/edit").put(userVerify, editQuantity)
cartRouter.route("/get/all/:typeOfStore/:city").get(userVerify, getAllCartItems)
cartRouter.route("/get/single/item/:productId/:variantId").get(userVerify, getSingleCartItem)

export {
    cartRouter
}