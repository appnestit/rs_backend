import { getMessaging } from "firebase-admin/messaging";
import { admin } from "../app.js";
import { Company } from "../models/company.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { pagination } from "../utils/pagination.js";
import bcrypt from "bcrypt"
import { v4 as uuidv4 } from "uuid";
import otpGenerator from "otp-generator"
import { AccountVerify } from "../models/phoneVerify.models.js";
import jwt from "jsonwebtoken"
import { Notification } from "../class/Notification.class.js";
import { Staff } from "../models/staff.model.js";

const notificationClass = new Notification()

// cookies option
const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    expires: new Date(Date.now() + 864000000),
    maxAge: 864000000
};

const generateOtpUser = asynchandler(async (req, res) => {
    const { verificationMode, email, phone } = req.body

    console.log(phone)

    const otp = otpGenerator.generate(4, { digits: true, lowerCaseAlphabets: false, specialChars: false, upperCaseAlphabets: false })

    console.log("Break 0")

    const existedOtp = await AccountVerify.findOne({
        $or: [
            { email: email || "null" },
            { phone: phone || "null" },
        ]
    })
    if (existedOtp) {
        existedOtp.otp = otp
        await existedOtp?.save({ validateBeforeSave: false })
    } else {
        const newOtp = AccountVerify.create({
            createdAt: Date.now(),
            email: email || "",
            phone: phone || "",
            otp: otp,
            verificationMethod: verificationMode
        })
        if (!newOtp) {
            return res.status(500).json(ApiError(500, "OTP does not saved"))
        }
    }


    console.log("Break 1")

    if (verificationMode === "Email") {
        const emailRes = await notificationClass.emailSender(
            email, "Verify Your Account", `Hi, a request has been generated to verify your account. Here is your one-time password ${otp}. Please do not share it with others.`
        )
        if (!emailRes?.isSuccess) {
            return res.status(emailRes?.statusCode).json(ApiError(emailRes?.statusCode, emailRes?.message))
        }
    } else if (verificationMode === "Phone") {
        console.log("Break 2")
        const smsRes = await notificationClass.smsSender(
            phone, `${otp} is the OTP for login verification - Powered By AppNest`
        )
        if (!smsRes?.isSuccess) {
            return res.status(smsRes?.statusCode).json(ApiError(smsRes?.statusCode, smsRes?.message))
        }
    } else {
        return res.status(400).json(ApiError(400, "Invalid verification method"))
    }

    return res.status(200).json(ApiResponse(200, "OTP has been generated"))
})

const verifyUserOtp = asynchandler(async (req, res) => {
    const { verificationMode, email, phone, givenOtp } = req.body

    console.log(email)
    console.log(phone)

    const existedUser = await AccountVerify.findOne({
        $or: [
            { email: email },
            { phone: phone },
        ]
    })
    if (!existedUser) {
        return res.status(404).json(ApiError(400, "OTP not found"))
    }

    if (existedUser?.otp !== givenOtp) {
        return res.status(403).json(ApiError(403, "OTP is incorrect"))
    }

    const verifiedToken = await jwt.sign(
        {
            verificationMode: verificationMode,
            email: email,
            phone: phone
        },
        process.env.VERIFIED_TOKEN,
        {
            expiresIn: process.env.VERIFIED_TOKEN_EXPIRTY
        }
    )
    if (!verifiedToken) {
        return res.status(500).json(ApiError(500, "Verified token generation failed"))
    }

    return res.status(200).json(ApiResponse(200, "Verification has been completed", {
        verifiedToken: verifiedToken
    }))
})

const userRegister = asynchandler(async (req, res) => {
    let { fullName, email, phoneNumber, password, fcmToken, verifiedToken } = req.body


    if (!verifiedToken) {
        return res.status(400).json(ApiError(400, "Token is required"))
    }

    const decodedToken = await jwt.verify(verifiedToken, process.env.VERIFIED_TOKEN)
    if (!decodedToken) {
        return res.status(400).json(ApiError(400, "Token is invalid"))
    }

    if (decodedToken?.verificationMode === "Email") {
        email = decodedToken?.email
    } else {
        phoneNumber = decodedToken?.phone
    }

    // check for existing user
    const existedUser = await User.findOne({ $or: [{ email: email || "null" }, { phone: phoneNumber || "null" }] })
    // console.log(existedUser)
    if (existedUser) return res.status(400).json(ApiError(400, "Email or phone number already exists"))

    const company = await Company.findOneAndUpdate(
        {},
        {
            $inc: {
                totalCustomer: 1
            }
        }
    )
    if (!company) return res.status(404).json(ApiError(404, "Company not found"))

    // generating unique customer id
    // E.g, Company00001
    const customerId = `${company?.companyName?.slice(0, 3)}${(Number(company?.totalCustomer) + 1).toString().padStart(5, "0")}`

    const splitedName = fullName?.split(" ")
    const uniqueNo = otpGenerator.generate(2, {
        digits: true,
        lowerCaseAlphabets: false,
        specialChars: false,
        upperCaseAlphabets: false
    })

    const referCode = `${splitedName[0]?.slice(0, 3)}${uniqueNo}${company?.discountPerRefer}`

    const newUser = await User.create({
        fullName: fullName,
        email: email || "",
        phone: phoneNumber,
        password: password,
        customerId: customerId,
        fcmToken: fcmToken || "",
        referCode: referCode,
        isReferUsed: false,
    })
    if (!newUser) return res.status(500).json(ApiError(500, "User not created"))

    // generating access token
    const accessToken = await newUser?.generateAccessToken()
    if (!accessToken) return res.status(500).json(ApiError(500, "Access token generation failed"))

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(ApiResponse(200, "User registered successfully", {
            ...newUser,
            accessToken: accessToken
        }))
})

const userLogin = asynchandler(async (req, res) => {
    const { emailOrphone, password, fcmToken } = req.body

    // check for the user
    const user = await User.findOne({ $or: [{ email: emailOrphone }, { phone: emailOrphone }] })
    if (!user) return res.status(404).json(ApiError(404, "User not found"))

    // now check if the user doc has password or not
    const userPassword = user?.password

    /*
    We are taking a large set of user data from the JSON file. Now, we can not recover the encrypted password from the dataset(we can but we shouldn't). So, we are parsing the data with some field because we do not need all field. Their code design and structure different from ours. No, those users do not have the password field. In that case, we send them OTP, after the verification, they will create a new password. That's how they will be set in our system. 
    */

    // check password field
    if (userPassword === undefined || userPassword === null || userPassword === "") {
        // code for the create password flow descripted above...
        /*
        Flow :-
        Generate OTP ---> send the OTP to the mobile number saved in the DB ---> redirect to the frontend OTP verification page ---> after successful verification ---> change password functionality
        
        For now,
        Omitting the OTP flow, directly redirect to the change password page
        */

        // return res.redirect("/change-password", 302) 
    }

    // now we know that, the user has password
    const isPasswordCorrect = await user.isPasswordCorrect(password)
    if (!isPasswordCorrect) return res.status(400).json(ApiError(400, "Password is incorrect"))

    // generating access token
    const accessToken = await user?.generateAccessToken()
    if (!accessToken) return res.status(500).json(ApiError(500, "Access token generation failed"))

    user.fcmToken = fcmToken || ""
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .json(ApiResponse(200, "User logged in successfully", {
            accessToken: accessToken
        }))
})

const getUser = asynchandler(async (req, res) => {
    // more code will go here
    return res.status(200).json(ApiResponse(200, "User fetched", req?.user))
})

const userLogout = asynchandler(async (req, res) => {
    return res
        .status(200)
        .clearCookie("accessToken", {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        })
        .json(ApiResponse(200, "User logged out successfully"))
})

const updateUserProfile = asynchandler(async (req, res) => {
    const { _id } = req.user
    const fields = req.body
    let updateData = {}

    if (req?.file !== undefined) {
        const { filename } = req?.file
        updateData["image"] = filename
    }

    Object.keys(fields).forEach(key => {
        if (fields[key] !== "" || fields[key] !== undefined || fields[key] !== null) {
            updateData[key] = fields[key]
        }
    })

    const updatedUser = await User.findByIdAndUpdate(
        _id,
        {
            $set: updateData
        },
        {
            new: true
        }
    )
    if (!updateData) return res.status(500).json(ApiError(500, "User not found"))

    return res.status(200).json(ApiResponse(200, "User profile updated", updatedUser))
})

const addAddress = asynchandler(async (req, res) => {
    const fields = req.body
    const { city } = req.body

    // const existedCity = await Staff.findOne({city: city})
    // if (!existedCity) {
    //     return res.status(404).json(ApiError(404, "Shop is not available"))
    // }

    const addressId = Math.floor(1000 + Math.random() * 9000);

    const updatedAddress = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $push: {
                address: {
                    ...fields,
                    addressId
                }
            }
        },
        {
            new: true
        }
    )
    if (!updatedAddress) return res.status(500).json(ApiError(500, "User not found"))

    return res.status(200).json(ApiResponse(200, "User profile updated", updatedAddress))
})

const editAddress = asynchandler(async (req, res) => {
    const { addressId, city } = req.body
    const fields = req.body
    let updateData = {}

    const existedCity = await Staff.findOne({ city: city })
    if (!existedCity) {
        return res.status(404).json(ApiError(404, "Shop is not available"))
    }

    Object.keys(fields).forEach(key => {
        if (fields[key] !== "" && fields[key] !== undefined && fields[key] !== null) {
            updateData[`address.$.${key}`] = fields[key]
        }
    })

    const updatedAddress = await User.findOneAndUpdate(
        { _id: req.user?._id, "address.addressId": addressId },
        {
            $set: updateData
        },
        {
            new: true
        }
    )
    if (!updatedAddress) return res.status(404).json(ApiError(404, "User not found"))

    return res.status(200).json(ApiResponse(200, "Address updated successfully", updatedAddress))

})

const deleteAddress = asynchandler(async (req, res) => {
    const { addressId } = req.params

    const deletedAddress = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $pull: {
                address: {
                    addressId: addressId
                }
            }
        },
        {
            new: true
        }
    )
    if (!deletedAddress) return res.status(404).json(ApiError(404, "Address not found"))

    return res.status(200).json(ApiResponse(200, "Address deleted successfully", deletedAddress))
})

const getAllUser = asynchandler(async (req, res) => {
    const { page } = req.params
    const { search } = req.query

    let data
    let totalPage

    if (search !== undefined && search?.length > 0) {
        const searchReg = new RegExp(search, "i")
        const user = await User.aggregate([
            {
                $lookup: {
                    from: "payments",
                    localField: "_id",
                    foreignField: "userId",
                    as: "payments"
                }
            },
            {
                $set: {
                    totalPayment: {
                        $sum: {
                            $map: {
                                input: {
                                    $filter: {
                                        input: "$payments",
                                        as: "payment",
                                        cond: {
                                            $eq: [
                                                "$$payment.paymentStatus",
                                                "success"
                                            ]
                                        }
                                    }
                                },
                                as: "payment",
                                in: "$$payment.totalPrice"
                            }
                        }
                    }
                }
            },
            {
                $set: {
                    totalPayment: {
                        $ifNull: ["$totalPayment", 0]
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { fullName: searchReg },
                        { phone: searchReg }
                    ]
                }
            }
        ])
        if (user?.length === 0) return res.status(404).json(ApiResponse(404, "No user found"))

        return res.status(200).json(ApiResponse(200, "User fetched", {
            data: user
        }))
    }

    const users = await User.aggregate([
        {
            $lookup: {
                from: "payments",
                localField: "_id",
                foreignField: "userId",
                as: "payments"
            }
        },
        {
            $set: {
                totalPayment: {
                    $sum: {
                        $map: {
                            input: {
                                $filter: {
                                    input: "$payments",
                                    as: "payment",
                                    cond: {
                                        $eq: [
                                            "$$payment.paymentStatus",
                                            "success"
                                        ]
                                    }
                                }
                            },
                            as: "payment",
                            in: "$$payment.totalPrice"
                        }
                    }
                }
            }
        },
        {
            $set: {
                totalPayment: {
                    $ifNull: ["$totalPayment", 0]
                }
            }
        },
        {
            $sort: {
                totalPayment: -1
            }
        }
    ])
    if (users?.length === 0) return res.status(200).json(ApiResponse(200, "No users fetched", users))

    try {
        const { newData, totalPages } = pagination(page, 20, users)
        totalPage = totalPages
        data = newData
    } catch (error) {
        console.log(error)
        return res.status(500).json(ApiError(500, "Something went wrong"))
    }

    const finalData = {
        totalPages: totalPage,
        data: data
    }

    return res.status(200).json(ApiResponse(200, "Users fetched", finalData))
})

const forgotPassword = asynchandler(async (req, res) => {
    const { password, verifiedToken } = req.body
    let email, phoneNumber

    if (!verifiedToken) {
        return res.status(400).json(ApiError(400, "Token is required"))
    }

    const decodedToken = await jwt.verify(verifiedToken, process.env.VERIFIED_TOKEN)
    if (!decodedToken) {
        return res.status(400).json(ApiError(400, "Token is invalid"))
    }

    if (decodedToken?.verificationMode === "Email") {
        email = decodedToken?.email
    } else {
        phoneNumber = decodedToken?.phone
    }

    if (!password) return res.status(400).json(ApiError(400, "All fields are required"))

    const encryptedPass = await bcrypt.hash(password, 10)
    console.log(decodedToken)
    console.log(phoneNumber)
    const updatedUser = await User.findOneAndUpdate(
        { $or: [{ email: email || "null" }, { phone: phoneNumber || "null" }] },
        {
            $set: {
                password: encryptedPass
            }
        }
    )
    if (!updatedUser) return res.status(404).json(ApiError(404, "User not found"))

    return res.status(200).json(ApiResponse(200, "Password has been changed"))
})

const sendNotificationToAll = asynchandler(async (req, res) => {
    const { title, body } = req.body

    const users = await User.find()
    if (users?.length === 0) return res.status(404).json(ApiError(404, "No user found"))

    let tokenArray = []

    users?.map((user) => {
        if (user?.fcmToken && user?.fcmToken?.length > 0) {
            tokenArray.push(user?.fcmToken)
        }
    })

    if (tokenArray?.length === 0) return res.status(404).json(ApiError(404, "No user can able to get notification"))

    const topic = uuidv4()

    try {
        await getMessaging().subscribeToTopic(tokenArray, topic)
    } catch (error) {
        return res.status(500).json(ApiError(500, "Subscribe topic failed"))
    }

    const message = {
        notification: {
            title: title,
            body: body,
        },
        topic: topic
    }

    try {
        const res = await admin.messaging().send(message)
    } catch (error) {
        console.log("Notification sent failed :: ", error)
        return res.status(500).json(ApiError(500, "Notification send failed"))
    }

    try {
        await getMessaging().unsubscribeFromTopic(tokenArray, topic)
    } catch (error) {
        return res.status(500).json(ApiError(500, "Subscribe topic failed"))
    }

    return res.status(200).json(ApiResponse(200, "Notification send successfully"))
})

const sendNotificationToSingleUser = asynchandler(async (req, res) => {
    const { title, body, fcmToken } = req.body

    if (!title || !body || !fcmToken) return res.status(400).json(ApiError(400, "All fields are required"))

    const message = {
        notification: {
            title: title,
            body: body,
        },
        android: {
            notification: {
                channelId: "fresly_default",
                clickAction: "OPEN_ACTIVTY",
                priority: "high",
                sound: "default",
                icon: "ic_logo"
            }
        },
        token: fcmToken
    }

    // send
    try {
        const res = await admin.messaging().send(message)
    } catch (error) {
        console.log("Notification sent failed :: ", error)
        return res.status(500).json(ApiError(500, "Notification send failed. Ask user to re-login."))
    }

    return res.status(200).json(ApiResponse(200, "Notification send successfully"))
})

const getReferralCode = asynchandler(async (req, res) => {
    const user = await User.findById(req.user?._id)
    if (!user) return res.status(404).json(ApiError(404, "User not found"))

    let referCode

    referCode = user?.referCode
    if (!referCode) {
        const company = await Company.findOne()
        if (!company) return res.status(404).json(ApiError(404, "Company not found"))

        const splitedName = user?.fullName?.split(" ")
        const slicedPhone = user?.phone?.slice(-2)

        const genreratedReferCode = `${splitedName[0]?.slice(0, 2)}${slicedPhone}${company?.discountPerRefer}`
        if (!genreratedReferCode) return res.status(500).json(ApiError(500, "Refer code generate failed"))

        user.referCode = genreratedReferCode
        await user.save({ validateBeforeSave: false })

        referCode = genreratedReferCode
    }

    return res.status(200).json(ApiResponse(200, "Refer code fetced", referCode))
})

export {
    userRegister,
    userLogin,
    getUser,
    userLogout,
    updateUserProfile,
    addAddress,
    editAddress,
    deleteAddress,
    getAllUser,
    forgotPassword,
    sendNotificationToAll,
    sendNotificationToSingleUser,
    getReferralCode,
    generateOtpUser,
    verifyUserOtp
}