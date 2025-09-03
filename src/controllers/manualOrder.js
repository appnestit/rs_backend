import { ManualOrder } from "../models/manualOrder.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { pagination } from "../utils/pagination.js";

const addOrder = asynchandler(async (req, res) => {
    if (req.files === undefined) return res.status(400).json(ApiError(400, "Order photo is required"))

    let filenames = []
    const imgArray = req.files
    imgArray.forEach(element => {
        if (element?.filename !== undefined) {
            filenames.push(element?.filename)
        }
    });

    const newOrder = await ManualOrder.create({
        userId: req.user?._id,
        username: req.user?.fullName,
        phone: req.user?.phone,
        orderPath: filenames,
        date: new Date()
    })
    if (!newOrder) return res.status(500).json(ApiError(500, "Order not created"))

    return res.status(200).json(ApiResponse(200, "Order created"))
})

const allOrders = asynchandler(async (req, res) => {
    const { status } = req.query
    const {page, limit} = req.params
    let orders
    let data
    let totalPage

    if (status && status?.length > 0) {
        orders = await ManualOrder.find({ orderStatus: status })
    } else {
        orders = await ManualOrder.find().sort({ _id: -1 })
    }

    if(orders?.length === 0) return res.status(200).json(ApiResponse(200, "No orders found", orders))

    try {
        const { newData, totalPages } = pagination(page, Number(limit), orders)
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

    return res.status(200).json(ApiResponse(200, "Orders fetched", finalData))
})

const changeStatus = asynchandler(async (req,res) => {
    const {status, orderId} = req.body

    console.log(status)
    console.log(orderId)

    const updatedStatus = await ManualOrder.findByIdAndUpdate(orderId, {
        $set: {
            orderStatus: status
        }
    }) 
    if(!updatedStatus) return res.status(404).json(ApiError(404, "Order not found"))

    return res.status(200).json(ApiResponse(200, "Order status has been changed"))
})

export {
    addOrder,
    allOrders,
    changeStatus,
}