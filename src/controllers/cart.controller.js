import mongoose from "mongoose";
import { Cart } from "../models/cart.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addToCart = asynchandler(async (req, res) => {
    const { typeOfStore, ...fields } = req.body

    if (typeOfStore === "Bakery") {
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $inc: {
                    "bakeryCart.item": 1,
                    "bakeryCart.price": fields?.totalPrice || 0
                }
            }
        )
    } else if (typeOfStore === "Rest") {
        await User.findByIdAndUpdate(
            req.user?._id,
            {
                $inc: {
                    "restCart.item": 1,
                    "restCart.price": fields?.totalPrice || 0
                }
            }
        )
    }

    const newItem = await Cart.create({
        ...fields,
        typeOfStore: typeOfStore,
        userId: req.user?._id
    })
    if (!newItem) return res.status(500).json(ApiError(500, "Item add to cart failed"))

    return res.status(200).json(ApiResponse(200, "Item added to cart", newItem))
})

const removeFromCart = asynchandler(async (req, res) => {
    const { itemId } = req.params

    const deletedItem = await Cart.deleteOne({ _id: itemId, userId: req.user?._id })
    if (deletedItem?.deletedCount === 0) return res.status(500).json(ApiError(500, "Item not deleted"))

    return res.status(200).json(ApiResponse(200, "Item deleted successfully"))
})

const editQuantity = asynchandler(async (req, res) => {
    const { value, itemId, opType, totalPrice, typeOfStore } = req.body
    if (isNaN(Number(value))) return res.status(400).json(ApiError(400, "Quantity is invalid"))

    if (opType === "add") {
        if (typeOfStore === "Bakery") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $inc: {
                        "bakeryCart.item": 1,
                        "bakeryCart.price": Number(totalPrice)
                    }
                }
            )
        } else if (typeOfStore === "Rest") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $inc: {
                        "restCart.item": 1,
                        "restCart.price": Number(totalPrice)
                    }
                }
            )
        }
    } else {
        if (typeOfStore === "Bakery") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $inc: {
                        "bakeryCart.item": -1,
                        "bakeryCart.price": -Number(totalPrice)
                    }
                }
            )
        } else if (typeOfStore === "Rest") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $inc: {
                        "restCart.item": -1,
                        "restCart.price": -Number(totalPrice)
                    }
                }
            )
        }
    }

    if (Number(value) === 0) {
        const deletedItem = await Cart.findByIdAndDelete(itemId)
        if (!deletedItem) return res.status(404).json(ApiError(404, "Item not found"))

        return res.status(200).json(ApiResponse(200, "Item deleted"))
    }

    const updatedItem = await Cart.findOneAndUpdate(
        { _id: itemId },
        {
            $set: {
                quantity: value
            }
        }
    )
    if (!updatedItem) return res.status(500).json(ApiError(500, "Item not updated"))

    return res.status(200).json(ApiResponse(200, "Item updated"))
})

const getAllCartItems = asynchandler(async (req, res) => {
    const { typeOfStore, city } = req.params

    const availableProducts = await Cart.aggregate([
        {
            $match: {
                cartType: "Product",
                typeOfStore: typeOfStore,
                userId: new mongoose.Types.ObjectId(req?.user?._id)
            }
        },
        {
            $lookup: {
                from: "productactives",
                let: {
                    productId: "$productId",
                    cityName: city
                }, // or your dynamic city
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    {
                                        $eq: [
                                            "$productId",
                                            "$$productId"
                                        ]
                                    },
                                    { $eq: ["$city", "$$cityName"] },
                                    { $eq: ["$isAvailable", true] } // Only include available ones
                                ]
                            }
                        }
                    }
                ],
                as: "productAvailble"
            }
        },
        {
            $match: {
                productAvailble: { $ne: [] } // Only include products that have at least one available productActive
            }
        }
    ])
    const addOnItems = await Cart.find(
        { typeOfStore: typeOfStore, userId: req?.user?._id, cartType: "AddOn" }
    )

    const items = [
        ...availableProducts,
        ...addOnItems
    ]

    return res.status(200).json(ApiResponse(200, "Items fetched", items))
})

const getSingleCartItem = asynchandler(async (req, res) => {
    const { productId, variantId } = req.params
    const { addOnName, typeOfStore } = req.query

    // console.log(addOnName)
    // console.log(typeOfStore)
    console.log("ProductID: ", productId)

    if (
        (typeof addOnName === "string" && addOnName?.trim() !== "") &&
        (typeof typeOfStore === "string" && typeOfStore?.trim() !== "")
    ) {
        const item = await Cart.findOne({ productTitle: addOnName, typeOfStore: typeOfStore, userId: req?.user?._id })
        if (!item) return res.status(404).json(ApiError(404, "Item not found"))

        console.log(item)

        return res.status(200).json(ApiResponse(200, "Item found", item))
    }

    const item = await Cart.findOne({ productId: productId, variantId: variantId, userId: req?.user?._id })
    if (!item) return res.status(404).json(ApiError(404, "Item not found"))

    console.log(item)

    return res.status(200).json(ApiResponse(200, "Item found", item))
})

export {
    addToCart,
    removeFromCart,
    editQuantity,
    getAllCartItems,
    getSingleCartItem
}