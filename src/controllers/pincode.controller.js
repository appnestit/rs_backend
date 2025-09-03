import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { Pincode } from "../models/pincode.model.js";

const addPincode = asynchandler(async (req, res) => {
    const { pincode } = req.body
    const city = req?.user?.city

    if (typeof pincode !== "string" || pincode?.trim()?.length !== 6) {
        return res.status(400).json(ApiError(400, "Pincode must be of 6 digits"))
    }

    const newPincode = await Pincode.create({
        pincode: pincode,
        isActive: true,
        city: city,
        staff: req?.user?._id
    })
    if (!newPincode) return res.status(500).json(ApiError(500, "Pincode create failed"))

    return res.status(200).json(ApiResponse(200, "Pincode created successfully"))
})

const updatePincode = asynchandler(async (req, res) => {
    const { pincodeId, pincode, isActive } = req.body
    let updateData = {}

    if (typeof pincode !== "string" || pincode?.trim()?.length !== 6) {
        return res.status(400).json(ApiError(400, "Pincode must be of 6 digits"))
    }

    if (pincode?.length > 0) {
        updateData["pincode"] = pincode
    }
    if (isActive !== undefined) {
        updateData["isActive"] = isActive
    }

    const updatedPincode = await Pincode.updateOne(
        { _id: pincodeId },
        {
            $set: updateData
        }
    )

    return res.status(200).json(ApiResponse(200, "Pincode updated"))
})

const deletePincode = asynchandler(async (req, res) => {
    const { pincodeId } = req.params

    const deletedPincode = await Pincode.deleteOne({ _id: pincodeId })
    if (deletedPincode.deletedCount === 0) return res.status(500).json(ApiError(500, "Pincode delete failed"))

    return res.status(200).json(ApiResponse(200, "Pincode deleted successfully"))
})

const getAllPincodeBySuperadmin = asynchandler(async (req, res) => {
    const pincode = await Pincode.aggregate([
        {
            $group: {
                _id: "$city",
                documents: {
                    $push: "$$ROOT"
                }
            }
        }
    ])

    return res.status(200).json(ApiResponse(200, "All pincode fetched", pincode))
})

const getAllPincodeByAdmin = asynchandler(async (req, res) => {
    const city = req?.user?.city
    const pincode = await Pincode.find({ city: city }).sort({ _id: -1 })

    return res.status(200).json(ApiResponse(200, "All pincode fetched", pincode))
})

const checkPincode = asynchandler(async (req, res) => {
    const { pincode } = req.params

    const result = await Pincode.findOne({ pincode: pincode, isActive: true })
    if (!result) return res.status(404).json(ApiError(404, "Pincode not found"))

    return res.status(200).json(ApiResponse(200, "Pincode found", result))
})

export {
    addPincode,
    updatePincode,
    deletePincode,
    getAllPincodeBySuperadmin,
    getAllPincodeByAdmin,
    checkPincode
}