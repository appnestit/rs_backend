import { AccountVerify } from "../models/phoneVerify.models.js";
import { Superadmin } from "../models/superadmin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import otpGenerator from "otp-generator"
import jwt from "jsonwebtoken"
import { Notification } from "../class/Notification.class.js";
import bcrypt from "bcrypt"

const notificationClass = new Notification()

const addSuperadmin = asynchandler(async (req, res) => {
    const { username, password, typeOfStore, email } = req.body

    if (!username || !password || !typeOfStore || !email) return res.status(400).json(ApiError(400, "All fields are required"))

    const existedEmail = await Superadmin.findOne({ $or: [{ email: email }, { username: username }] })
    if (existedEmail) {
        return res.status(403).json(ApiError("Username or email is existed"))
    }

    const existedSuperadmin = await Superadmin.findOne({
        typeOfStore: typeOfStore
    })
    if (existedSuperadmin) {
        return res.status(403).json(ApiError("A superadmin has already been registered"))
    }

    const newSuperadmin = await Superadmin.create({
        username: username,
        password: password,
        role: "superadmin",
        typeOfStore: typeOfStore,
        email: email
    })
    if (!newSuperadmin) return res.status(500).json(ApiError(500, "Superadmin not created"))

    return res.status(200).json(ApiResponse(200, "Superadmin created"))
})

const generateOtpSuperadmin = asynchandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json(ApiError(400, "Email is required"))
    }

    const existedStaff = await Superadmin.findOne({
        email: email
    })
    if (!existedStaff) {
        return res.status(404).json(ApiError(404, "Staff not found"))
    }

    const otp = otpGenerator.generate(4, {
        digits: true, lowerCaseAlphabets: false, specialChars: false, upperCaseAlphabets: false
    })
    if (!otp) {
        return res.status(500).json(ApiError(500, "OTP generation failed"))
    }

    const existedOtp = await AccountVerify.findOne({ email: email })
    if (existedOtp) {
        existedOtp.otp = otp
        await existedOtp?.save({ validateBeforeSave: false })
    } else {
        const newOtp = await AccountVerify.create({
            createdAt: Date.now(),
            email: email,
            otp: otp,
            verificationMethod: "Email"
        })
        if (!newOtp) {
            return res.status(500).json(ApiError(
                "OTP save has been failed"
            ))
        }
    }

    const emailRes = await notificationClass.emailSender(
        email, "Verify Your Account", `Hi, a request has been generated to verify your superadmin account. Here is your one-time password ${otp}. Please do not share it with anyone else.`
    )
    if (!emailRes?.isSuccess) {
        return res.status(emailRes?.statusCode).json(
            ApiError(emailRes?.statusCode, emailRes?.message)
        )
    }

    return res.status(200).json(ApiResponse(200, "OTP has been generated"))
})

const verifySuperadminOtp = asynchandler(async (req, res) => {
    const { email, givenOtp } = req.body

    if (
        (typeof email === "string" && email?.trim() === "") ||
        (typeof givenOtp === "string" && givenOtp?.trim() === "")
    ) {
        return res.status(400).json(ApiError(
            "Email and OTP are required"
        ))
    }

    const existedUser = await AccountVerify.findOne({
        email: email
    })
    if (!existedUser) {
        return res.status(404).json(ApiError(404, "OTP not found"))
    }

    if (existedUser?.otp !== givenOtp) {
        return res.status(403).json(ApiError(403, "OTP is incorrect"))
    }

    const verifiedToken = await jwt.sign(
        {
            verificationMethod: "Email",
            email: email,
        },
        process.env.VERIFIED_TOKEN,
        {
            expiresIn: process.env.VERIFIED_TOKEN_EXPIRTY
        }
    )
    if (!verifiedToken) {
        return res.status(500).json(ApiError(500, "Verified token generation failed"))
    }

    return res.status(200).json(ApiResponse(200, "Verification has been completed", verifiedToken))
})

const superadminForgotPassword = asynchandler(async (req, res) => {
    const { verifiedToken, password } = req.body

    if (!verifiedToken || !password) return res.status(400).json(ApiError(400, "All fields are required"))

    const decodedToken = await jwt.verify(
        verifiedToken, process.env?.VERIFIED_TOKEN
    )
    if (!decodedToken) {
        return res.status(400).json(ApiError(400, "Token is invalid"))
    }

    const existedSuperadmin = await Superadmin.findOne({ email: decodedToken?.email })
    if (!existedSuperadmin) return res.status(404).json(ApiError(404, "Superadmin not found"))

    existedSuperadmin.password = password
    await existedSuperadmin.save()

    if (existedSuperadmin.isJoined === false) {
        existedSuperadmin.isJoined = true
        await existedSuperadmin.save({ validateBeforeSave: false })
    }

    return res.status(200).json(ApiResponse(200, "New password created"))
})

const superadminLogin = asynchandler(async (req, res) => {
    const { username, password } = req.body

    if (!username || !password) return res.status(400).json(ApiError(400, "All fields are required"))

    const existedSuperadmin = await Superadmin.findOne({ username: username })
    if (!existedSuperadmin) return res.status(404).json(ApiError(404, "Superadmin not found"))

    const isPasswordCorrect = await existedSuperadmin.isPasswordCorrect(password)
    if (!isPasswordCorrect) return res.status(403).json(ApiError(403, "Password is incorrect"))

    const accessToken = await existedSuperadmin.generateAccessToken()
    if (!accessToken) return res.status(500).json(ApiError(500, "Access token not generted"))

    return res
        .status(200)
        .cookie("accessToken", accessToken)
        .json(ApiResponse(200, "Superadmin logged in"))
})

const getSuperadmin = asynchandler(async (req, res) => {
    return res.status(200).json(ApiResponse(200, "Superadmin fetched", req.user))
})

const resetSuperadminPassword = asynchandler(async (req, res) => {
    const { newPassword } = req.body

    if (!newPassword) {
        return res.status(400).json(ApiError("New password is required"))
    }

    // const encryptedPassword = await bcrypt.hash(newPassword, 10)
    // if (!encryptedPassword) {
    //     return res.status(500).json(ApiError(500, "Encryption has been failed"))
    // }

    const superadmin = await Superadmin.findById(req?.user?._id)
    if (!superadmin) {
        return res.status(404).json(ApiError(404, "Superadmin not found"))
    }

    superadmin.password = encryptedPassword
    superadmin.isJoined = true
    await superadmin?.save({ validateBeforeSave: false })

    return res.status(200).json(ApiResponse(200, "Password has been changed"))
})

const superAdminLogout = asynchandler(async (req, res) => {
    return res.status(200)
        .clearCookie("accessToken")
        .json(ApiResponse(200, "Employee logged out successfully"))
})

export {
    addSuperadmin,
    superadminForgotPassword,
    superadminLogin,
    getSuperadmin,
    generateOtpSuperadmin,
    verifySuperadminOtp,
    resetSuperadminPassword,
    superAdminLogout,
    superAdminLogout
}