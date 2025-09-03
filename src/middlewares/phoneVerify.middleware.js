import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asynchandler } from "../utils/asynchandler.js";
import jwt from "jsonwebtoken"

export const phoneVerify = asynchandler(async (req, res, next) => {
    const token = req.cookies?.verificationToken || req.header("Authorization")?.replace("Bearer ", "")
    if (!token) { return res.status(400).json(ApiError(400, "Phone number is not verified")) }

    const decodedToken = jwt.verify(token, process.env.VERIFICATION_TOKEN)
    if (!decodedToken) { return res.status(400).json(ApiError(400, "Token is invalid")) }
    
    req.phone = decodedToken?.verifiedPhone
    next()
})