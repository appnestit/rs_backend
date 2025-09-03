import { Charges } from "../models/charges.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addCharge = asynchandler(async (req, res) => {
    const { chargeAmount, minimumAmount, title, isEnable, chargeType, maximumAmount } = req.body

    const typeOfStore = req?.user?.typeOfStore

    const newCharge = await Charges.create({
        chargeAmount: chargeAmount,
        minimumAmount: minimumAmount,
        title: title,
        isEnable: isEnable,
        chargeType: chargeType,
        maximumAmount: maximumAmount,
        typeOfStore: typeOfStore
    })
    if (!newCharge) return res.status(500).json(ApiError(500, "Charge save failed"))

    return res.status(200).json(ApiResponse(200, "Charge added"))
})

const updateCharge = asynchandler(async (req, res) => {
    const { chargeId } = req.body
    const fields = req.body
    let updateData = {}

    Object.keys(fields).forEach((key) => {
        if (fields[key] !== "" || fields[key] === true || fields[false] || fields[key] >= 0) {
            updateData[key] = fields[key]
        }
    })

    console.log(updateData)

    const updatedCharge = await Charges.updateOne(
        { _id: chargeId },
        {
            $set: updateData
        }
    )
    if (updatedCharge?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Charge update failed"))

    return res.status(200).json(ApiResponse(200, "Charge updated"))
})

const deleteCharge = asynchandler(async (req, res) => {
    const { id } = req.params

    await Charges.findByIdAndDelete(id)

    return res.status(200).json(ApiResponse(200, "Charge deleted"))
})

const getChargesByStaff = asynchandler(async (req, res) => {
    const typeOfStore = req?.user?.typeOfStore
    const charges = await Charges.find({ typeOfStore: typeOfStore, isEnable: true })

    return res.status(200).json(ApiResponse(200, "Charges fetched", charges))
})

const getChargesAdmin = asynchandler(async (req, res) => {
    const { typeOfStore } = req.query
    let aggregationObj = {}

    if (typeof typeOfStore === "string" && typeOfStore.trim() !== "") {
        aggregationObj = {
            ...aggregationObj,
            typeOfStore: typeOfStore
        }
    }

    const charges = await Charges.find(aggregationObj)

    return res.status(200).json(ApiResponse(200, "Charges fetched", charges))
})

const getChargesClient = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params

    const charges = await Charges.find({ isEnable: true, typeOfStore: typeOfStore })

    return res.status(200).json(ApiResponse(200, "Charges fetched", charges))
})

export {
    addCharge,
    updateCharge,
    deleteCharge,
    getChargesAdmin,
    getChargesClient,
    getChargesByStaff
}