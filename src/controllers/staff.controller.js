import { Notification } from "../class/Notification.class.js";
import { Company } from "../models/company.model.js";
import { AccountVerify } from "../models/phoneVerify.models.js";
import { ProductActive } from "../models/productActive.model.js";
import { Staff } from "../models/staff.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import bcrypt from "bcrypt"
import otpGenerator from "otp-generator"
import jwt from "jsonwebtoken"

const notificationClass = new Notification()

const addStaff = asynchandler(async (req, res) => {
    const { username, password, name, email, city, typeOfStore } = req.body

    if (!username || !password || !city || !typeOfStore) return res.status(400).json(ApiError(400, "All fields are required"))

    const existedUsername = await Staff.findOne({ $or: [{ username: username }, { email: email }] })
    if (existedUsername) return res.status(400).json(ApiError(400, "Username or email is already existed"))

    const company = await Company.findOneAndUpdate(
        {},
        {
            $inc: {
                totalStaff: 1
            }
        }
    )
    if (!company) return res.status(404).json(ApiError(404, "Company not found"))

    // generating unique customer id
    // E.g, Company00001
    const staffId = `Staff${(Number(company?.totalStaff) + 1).toString().padStart(5, "0")}`

    const newStaff = await Staff.create({
        username: username,
        password: password,
        role: "staff",
        name: name,
        email: email,
        staffId: staffId,
        city: city,
        typeOfStore: typeOfStore
    })
    if (!newStaff) return res.status(500).json(ApiError(500, "Staff not created"))

    return res.status(200).json(ApiResponse(200, "Staff created"))
})

const generateOtpStaff = asynchandler(async (req, res) => {
    const { email } = req.body

    if (!email) {
        return res.status(400).json(ApiError(400, "Email is required"))
    }

    const existedStaff = await Staff.findOne({
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
        email, "Verify Your Account", `Hi, a request has been generated to verify your staff account. Here is your one-time password ${otp}. Please do not share it with anyone else.`
    )
    if (!emailRes?.isSuccess) {
        return res.status(emailRes?.statusCode).json(
            ApiError(emailRes?.statusCode, emailRes?.message)
        )
    }

    return res.status(200).json(ApiResponse(200, "OTP has been generated"))
})

const verifyStaffOtp = asynchandler(async (req, res) => {
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
            email: email
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

const staffForgotPassword = asynchandler(async (req, res) => {
    const { password, verifiedToken } = req.body

    if (!password || !verifiedToken) return res.status(400).json(ApiError(400, "Verified token and password are required"))

    const decodedToken = await jwt.verify(
        verifiedToken, process.env?.VERIFIED_TOKEN
    )
    if (!decodedToken) {
        return res.status(400).json(ApiError(400, "Token is invalid"))
    }

    const existedStaff = await Staff.findOne({ email: decodedToken?.email })
    if (!existedStaff) return res.status(404).json(ApiError(404, "Staff not found"))

    // const encryptedPassword = await bcrypt.hash(password, 10)
    // if (!encryptedPassword) return res.status(500).json(ApiError(500, "Password not generted"))

    existedStaff.password = password
    await existedStaff.save({ validateBeforeSave: false })

    return res.status(200).json(ApiResponse(200, "New password created"))
})

const staffChangePassword = asynchandler(async (req, res) => {
    const { password } = req.body

    // if email verification is implemented, the code will goes to the verification api

    if (!password) return res.status(400).json(ApiError(400, "Password is required"))

    // const existedStaff = await Staff.findById(req.user?._id)
    const existedStaff = await Staff.findById(req.user?._id)
    if (!existedStaff) return res.status(404).json(ApiError(404, "Staff not found"))

    existedStaff.password = password
    await existedStaff.save({ validateBeforeSave: false })

    return res.status(200).json(ApiResponse(200, "New password created"))
})

const staffLogin = asynchandler(async (req, res) => {
    const { username, password } = req.body

    if (!username || !password) return res.status(400).json(ApiError(400, "All fields are required"))

    const existedStaff = await Staff.findOne({ username: username })
    if (!existedStaff) return res.status(404).json(ApiError(404, "Staff not found"))

    if (!existedStaff?.isActive) {
        return res.status(404).json(ApiError(404, "Staff not found"))
    }

    const isPasswordCorrect = await existedStaff.isPasswordCorrect(password)
    console.log(isPasswordCorrect)
    if (!isPasswordCorrect) return res.status(403).json(ApiError(403, "Password is incorrect"))

    if (existedStaff.isJoined === false) {
        existedStaff.isJoined === true
        await existedStaff.save({ validateBeforeSave: false })
    }

    const accessToken = await existedStaff.generateAccessToken()
    if (!accessToken) return res.status(500).json(ApiError(500, "Access token not generted"))

    return res
        .status(200)
        .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: "None",
            maxAge: 864000000
        })
        .json(ApiResponse(200, "Staff logged in"))
})

const getStaff = asynchandler(async (req, res) => {
    return res.status(200).json(ApiResponse(200, "Staff fetched", req.user))
})

const getAllStaff = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params
    const { search } = req.query
    let aggregationObj = {
        typeOfStore: typeOfStore,
        isActive: true
    }

    if (typeof search === "object" && search?.trim() !== "") {
        const searchReg = new RegExp(search, "i")
        aggregationObj["$or"] = [
            { name: searchReg },
            { city: searchReg },
            { staffId: searchReg },
        ]
    }

    const staff = await Staff.find({ ...aggregationObj })

    return res.status(200).json(ApiResponse(200, "Staff has been fetched", staff))
})

const updateProductActiveByStaff = asynchandler(async (req, res) => {
    const { productId, isAvailable } = req.body

    const staffId = req?.user?._id
    const city = req?.user?.city

    const productData = await ProductActive.findOneAndUpdate(
        { productId: productId, staffId: staffId, city: city }, {
        $set: {
            isAvailable: isAvailable
        }
    }
    )
    if (!productData) {
        const newProduct = await ProductActive.create({
            staffId: staffId,
            city: city,
            productId: productId,
            isAvailable: isAvailable
        })
    }

    return res.status(200).json(ApiResponse(200, "Data has been inserted"))
})

const changeShopStatus = asynchandler(async (req, res) => {
    const { status } = req.body

    if (typeof status !== "boolean") {
        return res.status(400).json(ApiError(400, "Status is invalid"))
    }

    const staffData = await Staff.findById(req?.user?._id)
    if (!staffData) {
        return res.status(404).json(ApiError(404, "Staff not found"))
    }

    staffData.isShopClosed = status
    await staffData?.save({ validateBeforeSave: false })

    return res.status(200).json(ApiResponse(200, "Shop status  has been changed"))
})

const checkShopStatusbyCity = asynchandler(async (req, res) => {

    const { city, typeOfStore } = req.params

    const cityStatus = await Staff.find({
        city: city,
        isShopClosed: false,
        typeOfStore: typeOfStore
    }).select("-password")

    const status = cityStatus ? true : false

    return res.status(200).json(ApiResponse(200, "City status has been fetched", cityStatus))
})

const updateStaffProfile = asynchandler(async (req, res) => {
    const { staffId, ...fields } = req.body
    // const staffId = req?.user?._id
    let updateData = {}

    console.log(staffId)

    Object.keys(fields).map((key) => {
        const data = fields[key]
        if (
            (typeof data === "string" && data?.trim() !== "") ||
            (typeof data === "number" && !isNaN(Number(data))) ||
            (typeof data === "boolean")
        ) {
            updateData[key] = data
        }
    })

    // delete password
    if (updateData["password"]) {
        delete updateData["password"]
    }

    const updatedStaff = await Staff.findByIdAndUpdate(
        staffId, {
        $set: {
            ...updateData
        }
    }
    )
    console.log(updatedStaff)
    if (!updatedStaff) {
        return res.status(404).json(ApiError(404, "Staff not found"))
    }

    return res.status(200).json(200, "Staff data has bee updated")
})

const staffLogout = asynchandler(async (req, res) => {
    return res.status(200)
        .clearCookie("accessToken")
        .json(ApiResponse(200, "Employee logged out successfully"))
})

export {
    addStaff,
    staffForgotPassword,
    staffLogin,
    getStaff,
    staffChangePassword,
    getAllStaff,
    updateProductActiveByStaff,
    generateOtpStaff,
    verifyStaffOtp,
    changeShopStatus,
    checkShopStatusbyCity,
    updateStaffProfile,
    staffLogout
}