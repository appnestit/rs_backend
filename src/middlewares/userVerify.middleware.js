import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"

const userVerify = asynchandler(async (req, res, next) => {
    const token = req?.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    // console.log(token)
    if (!token) return res.status(404).json(ApiError(404, "User not logged in"))

    const decodedToken = jwt.decode(token, process.env.ACCESS_TOKEN_SECRET)
    if (!decodedToken) return res.status(500).json(ApiError(500, "Token is invalid"))

    const user = await User.findById(decodedToken?._id).select("-password")
    if (!user) return res.status(404).json(ApiError(404, "User not found"))

    req.user = user
    next()
})

export {
    userVerify
}