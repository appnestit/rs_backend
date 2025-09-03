import { Coupon } from "../models/coupon.model.js";
import { ManualOrder } from "../models/manualOrder.model.js";
import { Payment } from "../models/payment.model.js";
import { Catagory, Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const dashboardData = asynchandler(async (req, res) => {
    const { date } = req.query

    const city = req?.user?.city
    const typeOfStore = req?.user?.typeOfStore

    const startDate = new Date().setHours(0, 0, 0, 0)
    const endDate = new Date().setHours(23, 59, 59, 999)

    const todayOrder = await Payment.countDocuments({
        date: {
            $gte: startDate,
            $lte: endDate
        },
        typeOfStore: typeOfStore
    })
    const totalCategory = await Catagory.countDocuments({ typeOfStore: typeOfStore })
    const totalProduct = await Product.countDocuments({ typeOfStore: typeOfStore })
    const totalCancelReq = await Payment.countDocuments({ delivaryStatus: "Canceled", city: city, typeOfStore: typeOfStore })
    const totalCoupons = await Coupon.countDocuments({ typeOfStore: typeOfStore })
    const totalManualOrder = await ManualOrder.countDocuments({ orderStatus: "Waiting" }) // not needed
    const totalReferredOrders = await Payment.countDocuments({ isReferredOrder: true, typeOfStore: typeOfStore, city: city })

    const startofMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const endofMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
    console.log(startofMonth?.toUTCString())
    console.log(endofMonth?.toUTCString())
    const totalOrdersCurrentMonth = await Payment.countDocuments({
        date: {
            $gte: startofMonth?.toUTCString(),
            $lte: endofMonth?.toUTCString()
        },
        typeOfStore: typeOfStore
    })

    const data = {
        todayOrder: todayOrder,
        totalCategory: totalCategory,
        totalProduct: totalProduct,
        totalCancel: totalCancelReq,
        totalCoupons: totalCoupons,
        totalManualOrder: totalManualOrder,
        totalReferredOrders: totalReferredOrders,
        totalOrdersCurrentMonth: totalOrdersCurrentMonth
    }

    return res.status(200).json(ApiResponse(200, "Data fetched", data))
})

const todayOrderData = asynchandler(async (req, res) => {
    const { date } = req.query

    const city = req?.user?.city
    const typeOfStore = req?.user?.typeOfStore

    const newOrder = await Payment.find({ delivaryStatus: "Confirmed", typeOfStore: typeOfStore, city: city }).sort({ _id: -1 })

    return res.status(200).json(ApiResponse(200, "Data fetched", newOrder))
})

export {
    dashboardData,
    todayOrderData
}