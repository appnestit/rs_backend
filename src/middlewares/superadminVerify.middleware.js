import { Superadmin } from "../models/superadmin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"

const superadminVerify = asynchandler(async (req, res, next) => {
    const token = req?.cookies?.accessToken || req.header("Authentication")?.replace("Bearer ", "")
    if (!token) return res.status(404).json(ApiError(404, "Superadmin not logged in"))

    const decodedToken = jwt.decode(token, process.env.SUPERADMIN_ACCESS_TOKEN_SECRET)
    if (!decodedToken) return res.status(500).json(ApiError(500, "Token is invalid"))

    const user = await Superadmin.findById(decodedToken?._id).select("-password")
    if (!user) return res.status(404).json(ApiError(404, "Superadmin not found"))

    req.user = user
    next()
})

export {
    superadminVerify
}