import { Staff } from "../models/staff.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"

const staffVerify = asynchandler(async (req, res, next) => {
    const token = req?.cookies?.accessToken || req.header("Authentication")?.replace("Bearer ", "")
    if (!token) return res.status(404).json(ApiError(404, "Staff not logged in"))

    const decodedToken = jwt.decode(token, process.env.STAFF_ACCESS_TOKEN_SECRET)
    if (!decodedToken) return res.status(500).json(ApiError(500, "Token is invalid"))

    const user = await Staff.findById(decodedToken?._id).select("-password")
    if (!user) return res.status(404).json(ApiError(404, "Staff not found"))

    if (!user?.isActive) {
        return res.status(404).json(ApiError(404, "Staff not found"))
    }

    req.user = user
    next()
})

export {
    staffVerify
}