import { Company } from "../models/company.model.js";
import { User } from "../models/user.models.js";
import { WalletTransanction, WithdrawalReq } from "../models/walletTransanction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const applyWithdrawal = asynchandler(async (req, res) => {
    const { amount, upiId, bankAcNumber, ifscCode } = req.body

    const walletDetails = await User.findById(req.user?._id)
    if (walletDetails?.wallet?.money < amount) {
        return res.status(400).json(ApiError(400, "Insufficient balance"))
    }

    const newWithdrawalReq = await WithdrawalReq.create({
        amount: amount,
        upiId: upiId,
        bankAcNumber: bankAcNumber,
        ifscCode: ifscCode,
        userId: req.user?._id
    })
    if (!newWithdrawalReq) return res.status(500).json(ApiError(500, "Withrawal request not saved"))

    return res.status(200).json(ApiResponse(200, "Withdrawal request saved", newWithdrawalReq))
})

const addCoinToUser = asynchandler(async (req, res) => {
    const { point, userId } = req.body

    if (!point || !userId) return res.status(400).json(ApiError(400, "Coin value and user id is required"))
    if (isNaN(point)) return res.status(400).json(ApiError(400, "Coin value is invalid"))

    let totalMoney = 0

    const pointValueInMoney = await Company.findOne()

    totalMoney = point * Number(pointValueInMoney?.pointValueInMoney) / 100 // in paisa 1 rupees = 100 paisa

    console.log(totalMoney)
    console.log(point)

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: {
                "wallet.point": Number(point),
                "wallet.money": Number(totalMoney)
            }
        }
    )
    if (!user) return res.status(404).json(ApiError(404, "User not found"))

    const newTransanction = await WalletTransanction.create({
        amount: Number(totalMoney),
        point: Number(point),
        date: new Date(),
        pointOrigin: "Admin",
        isDone: true,
        userId: userId,
        transanctionType: "Credit"
    })
    if (!newTransanction) return res.status(500).json(ApiError(500, "Coin added but transanction record not created"))

    return res.status(200).json(ApiResponse(200, "Transanction has been done successfully"))
})

const createWithdrawal = asynchandler(async (req, res) => {
    const { withdrawalId } = req.body
    let files
    let filenameArray = []

    if (req?.files !== undefined) {
        files = req.files
    }

    if (Array.isArray(files)) {
        files?.map((file) => {
            if (file?.filename !== undefined) {
                filenameArray.push(file?.filename)
            }
        })
    }

    const withdrawalReq = await WithdrawalReq.findById(withdrawalId)
    if (!withdrawalReq) return res.status(404).json(ApiError(404, "Withdrawal request not found"))

    if (withdrawalReq?.isDone === true) return res.status(200).json(ApiResponse(200, "The request is already processed"))

    const pointValueInMoney = await Company.findOne()

    let points = (withdrawalReq.amount * 100) / pointValueInMoney?.pointValueInMoney

    console.log(points)

    const wallet = await User.findByIdAndUpdate(withdrawalReq?.userId, {
        $inc: {
            "wallet.point": -points,
            "wallet.money": -withdrawalReq?.amount,
            "wallet.withdrawalPoint": points,
            "wallet.withdrawalMoney": withdrawalReq?.amount
        }
    })

    const newDebit = await WalletTransanction.create({
        amount: withdrawalReq?.amount,
        point: points || 0,
        transanctionType: "Debit",
        isDone: true,
        supportingDocs: filenameArray,
        userId: withdrawalReq?.userId,
        withdrawalReqId: withdrawalId,
        date: new Date(),
        approvedBy: req?.user?._id
    })
    if (!newDebit) return res.status(500).json(ApiError(500, "Transanction not created"))

    withdrawalReq.isDone = true
    await withdrawalReq.save()

    return res.status(200).json(ApiResponse(200, "Withdrawal record created", newDebit))
})

const getTransanctionById = asynchandler(async (req, res) => {
    const { userId } = req.body

    const transanctions = await WalletTransanction.find({ userId: userId })
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})

const getTransanctionByIdUser = asynchandler(async (req, res) => {
    const { transType } = req.params
    const transanctions = await WalletTransanction.find({ userId: req.user?._id, transanctionType: transType }).sort({ _id: -1 })
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})

const getWithdrawalReqById = asynchandler(async (req, res) => {
    const { userId } = req.body

    const transanctions = await WithdrawalReq.find({ userId: userId })
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})

const getWithdrawalReqByIdUser = asynchandler(async (req, res) => {
    const transanctions = await WithdrawalReq.find({ userId: req.user?._id })
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})

const getAllTransanction = asynchandler(async (req, res) => {
    const transanctions = await WalletTransanction.aggregate([
        {
            $match: {
                transanctionType: "Debit"
            }
        },
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "user"
            }
        },
        {
            $lookup: {
                from: "superadmins",
                foreignField: "_id",
                localField: "approvedBy",
                as: "approvedBySuperadmin"
            }
        },
        {
            $lookup: {
                from: "withdrawreqs",
                foreignField: "_id",
                localField: "withdrawalReqId",
                as: "withdrawalReq"
            }
        },
        {
            $addFields: {
                user: {
                    $first: "$user"
                },
                withdrawalReq: {
                    $first: "$withdrawalReq"
                },
                approvedBySuperadmin: {
                    $first: "$approvedBySuperadmin"
                }
            }
        },
        {
            $sort: {
                _id: -1
            }
        }
    ])
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})

const getAllWithdrawal = asynchandler(async (req, res) => {
    const transanctions = await WithdrawalReq.aggregate([
        {
            $lookup: {
                from: "users",
                foreignField: "_id",
                localField: "userId",
                as: "user"
            }
        },
        {
            $addFields: {
                user: {
                    $first: "$user"
                }
            }
        },
        {
            $sort: {
                _id: -1
            }
        }
    ])
    if (!transanctions) return res.status(404).json(ApiError(404, "No transanctions found"))

    return res.status(200).json(ApiResponse(200, "Fetched", transanctions))
})


export {
    applyWithdrawal,
    createWithdrawal,
    getTransanctionById,
    getTransanctionByIdUser,
    getWithdrawalReqById,
    getWithdrawalReqByIdUser,
    getAllTransanction,
    getAllWithdrawal,
    addCoinToUser
}