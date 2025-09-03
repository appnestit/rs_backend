import { AppRelease } from "../models/appRelease.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addRelease = asynchandler(async(req,res) => {
    const {buildNumber, description, versionName} = req.body

    if(!buildNumber || !description || !versionName) return res.status(400).json(ApiError(400, "All fields are required"))
    if(isNaN(buildNumber) || Number(buildNumber) <= 0) return res.status(400).json(ApiError(400, "Build number should be a number and more bigger than 0"))

    const newRelease = await AppRelease.create({
        buildNumber: Number(buildNumber),
        versionName: versionName,
        description: description,
        date: new Date().toLocaleDateString().replace(/\//g, "-")
    })
    if(!newRelease) return res.status(500).json(ApiError(500, "Release save failed"))

    return res.status(200).json(ApiResponse(200, "Release has been saved", newRelease))
})

const editRelease = asynchandler(async(req,res) => {
    const {buildNumber, description, versionName, releaseId} = req.body
    let updateData = {}

    if(!releaseId) return res.status(400).json(ApiError(400, "Release ID is required"))

    if(buildNumber !== undefined && !isNaN(buildNumber) && buildNumber > 0) {
        updateData["buildNumber"] = Number(buildNumber)
    }
    if(versionName !== undefined && versionName?.length > 0) {
        updateData["versionName"] = versionName
    }
    if(description !== undefined && description?.length > 0) {
        updateData["description"] = description
    }

    console.log(releaseId)

    const updatedRelease = await AppRelease.findByIdAndUpdate(
        releaseId,
        {
            $set: updateData
        }
    )
    if(!updatedRelease) return res.status(404).json(ApiError(404, "Release not found"))

    return res.status(200).json(ApiResponse(200, "Release has been updated"))
})

const deleteRelease = asynchandler(async(req,res) => {
    const {releaseId} = req.params

    const deletedRelease = await AppRelease.findByIdAndDelete(releaseId)
    if(!deletedRelease) return res.status(404).json(ApiError(404, "Release not found"))

    return res.status(200).json(ApiResponse(200, "Release has been deleted"))
})

const getAllRelease = asynchandler(async(req,res) => {
    const data = await AppRelease.find().sort({buildNumber: -1})

    return res.status(200).json(ApiResponse(200, "Releases fetched", data))
})

const getLatestRelease = asynchandler(async(req,res) => {
    const data = await AppRelease.find().sort({buildNumber: -1}).limit(1)
    if (!Array.isArray(data) || data?.length === 0) {
        return res.status(200).json(ApiResponse(200, "Release fetched", data))
    }

    return res.status(200).json(ApiResponse(200, "Release fetched", data[0]))
})

export {
    addRelease,
    editRelease,
    deleteRelease,
    getAllRelease,
    getLatestRelease
}