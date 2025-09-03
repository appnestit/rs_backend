import { Company } from "../models/company.model.js";
import { Coupon } from "../models/coupon.model.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addCoupon = asynchandler(async (req, res) => {
    const { discount, days, discountType, minimumAmount, isPublic, couponName } = req.body

    const typeOfStore = req?.user?.typeOfStore

    const newCoupon = await Coupon.create({
        coupon: couponName,
        discount: discount,
        expireAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000), // date to milis
        discountType: discountType,
        minimumAmount: minimumAmount,
        isPublic: isPublic,
        days: days,
        typeOfStore: typeOfStore
    })
    if (!newCoupon) return res.status(500).json(ApiError(500, "Coupon save failed"))

    return res.status(200).json(ApiResponse(200, "Coupon generated", newCoupon))
})

const deleteCoupon = asynchandler(async (req, res) => {
    const { id } = req.params

    await Coupon.findByIdAndDelete(id)

    return res.status(200).json(ApiResponse(200, "Coupon deleted"))
})

const checkCoupon = asynchandler(async (req, res) => {
    const { coupon, typeOfStore } = req.params

    const searchEg = RegExp(coupon, "i")

    const existedCoupon = await Coupon.findOne({ coupon: searchEg, typeOfStore: typeOfStore })
    if (!existedCoupon) return res.status(400).json(ApiError(400, "Coupon doesn't exist"))

    return res.status(200).json(ApiResponse(200, "Coupon fetched", existedCoupon))
})

const getAllCouponByAdmin = asynchandler(async (req, res) => {
    const { typeOfStore } = req.query
    let aggregationObj = {}

    if (typeof typeOfStore === "string" && typeOfStore.trim() !== "") {
        aggregationObj = {
            typeOfStore: typeOfStore
        }
    }

    const coupons = await Coupon.find(aggregationObj)
    return res.status(200).json(ApiResponse(200, "Coupon fetched", coupons))
})

const getAllCouponByStaff = asynchandler(async (req, res) => {
    const typeOfStore= req.user?.typeOfStore
    const coupons = await Coupon.find({
        typeOfStore: typeOfStore
    })

    console.log(coupons)

    return res.status(200).json(ApiResponse(200, "Coupon fetched", coupons))
})

const editCoupon = asynchandler(async (req, res) => {
    const { couponId } = req.body
    const fields = req.body
    let updateData = {}

    Object.keys(fields).forEach((key) => {
        if (fields[key] !== "" || fields[key] === true || fields[false] || fields[key] >= 0) {
            updateData[key] = fields[key]
        }
    })

    if (updateData?.days !== undefined && updateData?.days >= 0) {
        updateData["expireAt"] = new Date(Date.now() + updateData?.days * 24 * 60 * 60 * 1000) // date to milis
    }

    const updatedCoupon = await Coupon.updateOne(
        { _id: couponId },
        {
            $set: updateData
        }
    )
    if (updatedCoupon?.modifiedCount === 0) return res.status(500).json(ApiError(500, "No fields updated"))

    return res.status(200).json(ApiResponse(200, "Coupon updated"))
})

const getCouponsClient = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params

    const coupons = await Coupon.find({ isActive: true, typeOfStore: typeOfStore })

    return res.status(200).json(ApiResponse(200, "Coupon fetched", coupons))
})

const checkReferralCode = asynchandler(async (req, res) => {
    const { referCode } = req.params

    const user = await User.findOne({ referCode: referCode })
    if (!user) return res.status(404).json(ApiError(404, "Referral code invalid"))

    const company = await Company.findOne()
    if (!company) return res.status(404).json(ApiError(404, "Company not found"))

    const data = {
        discount: company?.discountPerRefer,
        referUserId: user?._id
    }

    return res.status(200).json(ApiResponse(200, "Referral details fetched", data))
})

export {
    addCoupon,
    deleteCoupon,
    checkCoupon,
    getCouponsClient,
    editCoupon,
    checkReferralCode,
    getAllCouponByAdmin,
    getAllCouponByStaff
}