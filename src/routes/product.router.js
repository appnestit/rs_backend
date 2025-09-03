import { Router } from "express";
import { staffVerify } from "../middlewares/staff.middleware.js";
import { addAddOnProduct, addCatagory, addImage, addProduct, addReview, addSection, addSubcategory, addVariant, addVideo, deleteAddOnProduct, deleteCatagory, deleteImage, deleteProduct, deleteReview, deleteSection, deleteSubcategory, deleteVariant, deleteVideo, editAddOnProduct, editVideo, getAllCatagories, getAllSection, getAllSubcategories, getAllVideos, getCatagories, getProducts, getProductsAdmin, getReviews, getSingleProduct, getVideoByProduct, searchProducts, updateCatagory, updateProduct, updateSection, updateSubcategory, updateVariant } from "../controllers/product.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { userVerify } from "../middlewares/userVerify.middleware.js";
import { superadminVerify } from "../middlewares/superadminVerify.middleware.js";

const productRouter = Router()

// products APIs
productRouter.route("/add").post(superadminVerify, addProduct)
productRouter.route("/edit").put(superadminVerify, updateProduct)
productRouter.route("/delete/:productId").delete(superadminVerify, deleteProduct)
productRouter.route("/image/add").post(superadminVerify, upload.array("productImg", 6), addImage)
productRouter.route("/image/delete/:productId/:imageUrl").delete(superadminVerify, deleteImage)
productRouter.route("/variant/add").post(superadminVerify, addVariant)
productRouter.route("/variant/update").put(superadminVerify, updateVariant)
productRouter.route("/variant/delete/:productId/:variantId").delete(superadminVerify, deleteVariant)
productRouter.route("/add-on/add").post(superadminVerify, addAddOnProduct)
productRouter.route("/add-on/edit").put(superadminVerify, editAddOnProduct)
productRouter.route("/add-on/delete").post(superadminVerify, deleteAddOnProduct)

// product fetch
productRouter.route("/get/all/:page/:limit/:typeOfStore").get(getProducts)
productRouter.route("/get/superadmin/all/:page/:limit/:typeOfStore").get(superadminVerify, getProductsAdmin)
productRouter.route("/get/staff/all/:page/:limit/:typeOfStore").get(staffVerify, getProductsAdmin)
productRouter.route("/get/single/:productId").get(getSingleProduct)
productRouter.route("/search/:typeOfStore").get(searchProducts)

// catagory APIs
productRouter.route("/catagory/add").post(superadminVerify, upload.single("catagoryImg"), addCatagory)
productRouter.route("/catagory/edit").put(superadminVerify, upload.single("catagoryImg"), updateCatagory)
productRouter.route("/catagory/delete/:catagoryId").delete(superadminVerify, deleteCatagory)

// section APIs
productRouter.route("/section/add/:name/:foodType/:typeOfStore").get(superadminVerify, addSection)
productRouter.route("/section/edit").put(superadminVerify, updateSection)
productRouter.route("/section/delete/:sectionId").delete(superadminVerify, deleteSection)

// fetch sections
productRouter.route("/section/get/all/:typeOfStore").get(getAllSection)

// subcategory APIs
productRouter.route("/subcategory/add").post(superadminVerify, upload.single("subcategoryImg"), addSubcategory)
productRouter.route("/subcategory/edit").put(superadminVerify, upload.single("subcategoryImg"), updateSubcategory)
productRouter.route("/subcategory/delete/:sectionId").delete(superadminVerify, deleteSubcategory)

// fetch subcategories
productRouter.route("/subcategory/get/all").get(getAllSubcategories)

// catagory fetch
productRouter.route("/catagory/get/all/:page/:limit/:typeOfStore").get(getCatagories)
productRouter.route("/catagory/list/:typeOfStore").get(getAllCatagories)

// review APIs
productRouter.route("/review/add").post(userVerify, addReview)
productRouter.route("/review/delete").delete(userVerify, deleteReview)

// fetch review APIs
productRouter.route("/review/get/all/:productId/:page").get(getReviews)

// fetch video review APIs
productRouter.route("/review/video/get/product/:productId").get(getVideoByProduct)
productRouter.route("/review/video/get/all/:limit").get(getAllVideos)

export {
    productRouter
}