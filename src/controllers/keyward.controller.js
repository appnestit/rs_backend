import mongoose from "mongoose";
import { Keyward } from "../models/keywards.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.models.js";
import { pagination } from "../utils/pagination.js";

const addKeyward = asynchandler(async (req, res) => {
    const { name, desc, typeOfStore, foodType } = req.body

    const newKeyward = await Keyward.create({
        name: name,
        desc: desc,
        typeOfStore: typeOfStore,
        foodType: foodType
    })
    if (!newKeyward) return res.status(500).json(ApiError(500, "Keyward create failed"))

    return res.status(200).json(ApiResponse(200, "Keyward created successfully"))
})

const updateKeyward = asynchandler(async (req, res) => {
    const { keywardId, name, isActive, desc } = req.body
    let updateData = {}

    if (name?.length > 0) {
        updateData["name"] = name
    }
    if (isActive !== undefined) {
        updateData["isActive"] = isActive
    }
    if (desc !== undefined) {
        updateData["desc"] = desc
    }

    const updatedKeyward = await Keyward.updateOne(
        { _id: keywardId },
        {
            $set: updateData
        }
    )

    return res.status(200).json(ApiResponse(200, "Keyward updated"))
})

const deleteKeyward = asynchandler(async (req, res) => {
    const { keywardId } = req.params

    const deletedKeyward = await Keyward.deleteOne({ _id: keywardId })
    if (deletedKeyward.deletedCount === 0) return res.status(500).json(ApiError(500, "Keyward delete failed"))

    return res.status(200).json(ApiResponse(200, "Keyward deleted successfully"))
})

const getAllKeyward = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params
    const { foodType } = req.query
    let aggregationObject = {
        typeOfStore: typeOfStore
    }

    if (typeof foodType === "string" && foodType.trim() !== "") {
        aggregationObject = {
            ...aggregationObject,
            foodType: foodType
        }
    }

    const keywards = await Keyward.find({ ...aggregationObject }).sort({ _id: -1 })

    return res.status(200).json(ApiResponse(200, "All keywards fetched", keywards))
})

const getKeywardsWithProducts = asynchandler(async (req, res) => {
    const { typeOfStore, limit } = req.params
    const { foodType, city } = req.query
    let data
    let totalPage

    if (isNaN(Number(limit))) {
        return res.status(400).json(ApiError(400, "Limit should be a number"))
    }

    console.log(city)

    let aggregationArray = [
        {
            $match: {
                typeOfStore: typeOfStore,
                isActive: true
            }
        }
    ]

    if (typeof foodType === "string" && foodType.trim() !== "") {
        const foodTypeMatchObject = {
            foodType: foodType
        }

        aggregationArray.push(foodTypeMatchObject)
    }

    console.log(city)

    if (typeof city === "string" && city.trim() !== "") {
        const cityReg = new RegExp(city, "i")

        const arr = [
            {
                $lookup: {
                    from: "products",
                    let: { keywordId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $in: ["$$keywordId", { $ifNull: ["$keyward", []] }] },
                                        { $eq: ["$isActive", true] } // ✅ Only active products
                                    ]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: "productactives",
                                let: {
                                    productId: "$_id",
                                    cityName: city
                                },
                                pipeline: [
                                    {
                                        $match: {
                                            $expr: {
                                                $and: [
                                                    { $eq: ["$productId", "$$productId"] },
                                                    { $eq: ["$city", "$$cityName"] },
                                                    { $eq: ["$isAvailable", true] }
                                                ]
                                            }
                                        }
                                    }
                                ],
                                as: "productAvailable"
                            }
                        },
                        {
                            $match: {
                                productAvailable: { $ne: [] } // Only include available products
                            }
                        }
                    ],
                    as: "products"
                }
            },
            {
                $match: {
                    products: { $ne: [] } // Optional: only keep keywords with valid products
                }
            }
        ]

        aggregationArray = [...aggregationArray, ...arr]
    } else {
        const arr = [
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "keyward",
                    as: "products"
                }
            },
            {
                $addFields: {
                    products: {
                        $filter: {
                            input: "$products",
                            as: "product",
                            cond: { $eq: ["$$product.isActive", true] }
                        }
                    }
                }
            },
            {
                $match: {
                    products: { $ne: [] } // Optional: only include keywords with active products
                }
            }
        ];

        aggregationArray = [...aggregationArray, ...arr]
    }

    const sliceProductsObj = {
        $set: {
            products: {
                $slice: ["$products", Number(limit)]
            }
        }
    }

    aggregationArray.push(sliceProductsObj)

    const products = await Keyward.aggregate(aggregationArray);

    return res.status(200).json(ApiResponse(200, "Orders fetched", products))
})

const getSingleKeyward = asynchandler(async (req, res) => {
    const { keywordId, limit } = req.params

    if (isNaN(Number(limit)) || Number(limit) <= 0) {
        return res.status(400).json(ApiError(400, "Limit should be a number and greater then 0"))
    }

    const data = await Keyward.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(keywordId),
                isActive: true
            }
        },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "keyward",
                as: "products"
            }
        },
        {
            $set: {
                products: {
                    $slice: ["$products", limit]
                }
            }
        }
    ])

    return res.status(200).json(ApiResponse(200, "Data fetched", data))
})

export {
    addKeyward,
    updateKeyward,
    deleteKeyward,
    getAllKeyward,
    getKeywardsWithProducts,
    getSingleKeyward
}