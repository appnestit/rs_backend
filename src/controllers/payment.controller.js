import { Payment } from "../models/payment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { v4 as uuidv4 } from "uuid";
import { Cart } from "../models/cart.model.js";
import { Company } from "../models/company.model.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ToWords } from "to-words";
import axios from "axios";
import { pagination } from "../utils/pagination.js";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { WalletTransanction } from "../models/walletTransanction.model.js";
import { sendPushNotification } from "../utils/notificationOps.js";

const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
        currencyOptions: {
            // can be used to override defaults for the selected locale
            name: 'Rupee',
            plural: 'Rupees',
            symbol: '₹',
            fractionalUnit: {
                name: 'Paisa',
                plural: 'Paise',
                symbol: '',
            },
        },
    },
});

const checkout = asynchandler(async (req, res) => {
    const {
        products,
        totalPrice,
        coupon,
        discount,
        address,
        charges,
        chargeAmount,
        discountType,
        deliveryTime,
        totalPoints,
        referDiscount,
        referUserId,
        referCode,
        typeOfStore,
        city,
        specialMessage,
        paymentMethod
    } = req.body;

    let totalMoney = 0

    const pointValueInMoney = await Company.findOne()

    totalMoney = totalPoints * Number(pointValueInMoney?.pointValueInMoney) / 100 // in paisa 1 rupees = 100 paisa

    const updatedTracks = await Company.findOneAndUpdate(
        {},
        {
            $inc: {
                totalOrder: 1,
            }
        }
    )

    const orderId = `ODRS${(Number(updatedTracks?.totalOrder) + 1)?.toString().padStart(3, "0")}`

    let isReferredOrder = false
    if (referDiscount > 0 && referUserId?.length > 0 && referCode?.length > 0) {
        isReferredOrder = true
    }

    const newOrder = await Payment.create({
        products: products,
        order_id: orderId,
        totalPrice: totalPrice,
        coupon: coupon || null,
        discount: discount || null,
        paymentStatus: "Due",
        paymentMethod: paymentMethod,
        address: address,
        userId: req.user?._id,
        chargeAmount: chargeAmount,
        charges: charges || null,
        discountType: discountType,
        orderNumber: Number(updatedTracks?.totalOrder) + 1,
        serialNo: Number(updatedTracks?.totalOrder) + 1,
        deliveryTime: deliveryTime,
        delivaryStatus: "Confirmed",
        totalPoints: totalPoints,
        date: new Date().setHours(0, 0, 0, 0),
        referDiscount: referDiscount,
        referUserId: isReferredOrder ? referUserId : undefined,
        referCode: referCode,
        isReferredOrder: isReferredOrder,
        dateAndTime: new Date(),
        typeOfStore: typeOfStore,
        city: city,
        specialMessage: specialMessage
    });
    if (!newOrder) return res.status(500).json(ApiError(500, "Order not created"));

    // set money in transanction
    const newTransanction = await WalletTransanction.create({
        amount: Number(totalMoney),
        point: totalPoints,
        date: new Date(),
        transanctionType: "Credit",
        isDone: true,
        paymentId: newOrder?._id,
        userId: req.user?._id,
        pointOrigin: "Product",
        orderId: orderId
    })

    if (isReferredOrder) {
        await User.findByIdAndUpdate(
            req?.user?._id,
            {
                $set: {
                    isReferUsed: isReferredOrder,
                    usedReferCode: referCode
                }
            }
        )
    }

    try {
        await Cart.deleteMany({ userId: req.user?._id });

        if (typeOfStore === "Bakery") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $set: {
                        "bakeryCart.item": 0,
                        "bakeryCart.price": 0,
                    },
                    $inc: {
                        "wallet.point": Number(totalPoints),
                        "wallet.money": Number(totalMoney)
                    }
                }
            )
        } else if (typeOfStore === "Rest") {
            await User.findByIdAndUpdate(
                req.user?._id,
                {
                    $set: {
                        "restCart.item": 0,
                        "restCart.price": 0,
                    },
                    $inc: {
                        "wallet.point": Number(totalPoints),
                        "wallet.money": Number(totalMoney)
                    }
                }
            )
        }

    } catch (error) {
        return res.status(500).json(ApiError(500, "Cart clear failed"));
    }

    if (!newTransanction) return res
        .status(200)
        .json(ApiResponse(200, "Order created successfully but transanction data save failed", newOrder));

    return res
        .status(200)
        .json(ApiResponse(200, "Order created successfully", newOrder));
})

const myOrders = asynchandler(async (req, res) => {
    const orders = await Payment.find({ userId: req.user?._id }).sort({ _id: -1 })
    return res.status(200).json(ApiResponse(200, "Orders fetched", orders))
})

const getSingleOrderUser = asynchandler(async (req, res) => {
    const { paymentId } = req.params

    const order = await Payment.findOne({ _id: paymentId, userId: req.user?._id })
    if (!order) return res.status(404).json(ApiError(404, "Order not found"))

    return res.status(200).json(ApiResponse(200, "Order fetched", order))
})

const getSingleOrderStaff = asynchandler(async (req, res) => {
    const { paymentId } = req.params

    const order = await Payment.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(paymentId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $addFields: {
                user: {
                    $first: "$user"
                }
            }
        }
    ])
    if (!order) return res.status(404).json(ApiError(404, "Order not found"))

    return res.status(200).json(ApiResponse(200, "Order fetched", order))
})

const allOrdersStaff = asynchandler(async (req, res) => {

    const { page, city, typeOfStore } = req.params
    const { keywords, search, startDate, endDate } = req.query
    let aggregationArray = []

    let data
    let totalPage
    let rawData

    // mandatory $match field
    const mandatoryAggObj = {
        $match: {
            city: city,
            typeOfStore: typeOfStore
        }
    }

    aggregationArray.push(mandatoryAggObj)

    // console.log(startDate)
    // console.log(endDate)

    if (
        (typeof startDate == "string" && !isNaN(Number(new Date(startDate).getMonth()))) &&
        (typeof endDate == "string" && !isNaN(Number(new Date(endDate).getMonth())))
    ) {
        const aggregationObject = {
            $match: {
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                }
            }
        }

        aggregationArray.push(aggregationObject)
    }

    if (keywords !== undefined && keywords?.length > 0) {
        const keywordReg = new RegExp(keywords, "i")

        const aggregationObject = {
            $match: {
                delivaryStatus: keywordReg,
            }
        }

        aggregationArray.push(aggregationObject)
    } 
    
    if (search !== undefined && search?.length > 0) {
        const searchReg = new RegExp(search, "i");

        const customAggArray = [
            {
                $match: {
                    city: city,
                    typeOfStore: typeOfStore
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $addFields: {
                    user: { $first: "$user" }
                }
            },
            {
                $addFields: {
                    username: "$user.fullName",
                    phone: "$user.phone"
                }
            },
            {
                $match: {
                    $or: [
                        { username: { $regex: searchReg } },
                        { phone: { $regex: searchReg } },
                        { paymentStatus: { $regex: searchReg } },
                        { order_id: { $regex: searchReg } }
                    ]
                }
            }
        ]

        aggregationArray = [...aggregationArray, ...customAggArray]

    }

    // sorting
    const sortObj = {
        $sort: {
            _id: -1
        }
    }

    aggregationArray.push(sortObj)

    const result = await Payment.aggregate(aggregationArray)
    if (result?.length === 0) {
        return res.status(200).json(ApiResponse(200, "No result found", result))
    }

    try {
        const { newData, totalPages } = pagination(page, 20, result)
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

const allOrdersSuperadmin = asynchandler(async (req, res) => {

    const { page, typeOfStore } = req.params
    const { keywords, search, startDate, endDate } = req.query
    let aggregationArray = []

    // console.log(startDate)

    let data
    let totalPage
    let rawData

    if (typeof typeOfStore === "string" && typeOfStore?.trim() !== "") {
        const aggregationObject = {
            $match: {
                typeOfStore: typeOfStore
            }
        }

        aggregationArray.push(aggregationObject)
    }

    if (
        (typeof startDate == "string" && !isNaN(Number(new Date(startDate).getMonth()))) &&
        (typeof endDate == "string" && !isNaN(Number(new Date(endDate).getMonth())))
    ) {
        const aggregationObject = {
            $match: {
                date: {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate),
                }
            }
        }

        aggregationArray.push(aggregationObject)
    }

    if (keywords !== undefined && keywords?.length > 0) {
        const keywordReg = new RegExp(keywords, "i")

        const aggregationObject = {
            $match: {
                delivaryStatus: keywordReg,
            }
        }

        aggregationArray.push(aggregationObject)
    } 
    
    if (search !== undefined && search?.length > 0) {
        const searchReg = new RegExp(search, "i");

        const customAggArray = [
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $addFields: {
                    user: { $first: "$user" }
                }
            },
            {
                $addFields: {
                    username: "$user.fullName",
                    phone: "$user.phone"
                }
            },
            {
                $match: {
                    $or: [
                        { username: { $regex: searchReg } },
                        { phone: { $regex: searchReg } },
                        { paymentStatus: { $regex: searchReg } },
                        { order_id: { $regex: searchReg } },
                        { city: { $regex: searchReg } },
                    ]
                }
            }
        ]

        aggregationArray = [...aggregationArray, ...customAggArray]

    }

    // sorting
    const sortObj = {
        $sort: {
            _id: -1
        }
    }

    aggregationArray.push(sortObj)

    const result = await Payment.aggregate(aggregationArray)
    if (result?.length === 0) {
        return res.status(200).json(ApiResponse(200, "No result found", result))
    }

    try {
        const { newData, totalPages } = pagination(page, 20, result)
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

const changeDelivaryStatus = asynchandler(async (req, res) => {
    const { paymentId, status } = req.params

    const updatedStatus = await Payment.findOneAndUpdate(
        { _id: paymentId },
        {
            $set: {
                delivaryStatus: status
            }
        }
    )
    if (updatedStatus?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Status not changed"))

    if (status === "Prepeared") {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const order = await Payment.findById(paymentId)
        const company = await Company.findOne({typeOfStore: updatedStatus?.typeOfStore})

        const logoPath = path.join(__dirname, `../../tmp/static/logo.png`);
        const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
        const logoSrc = `data:image/png;base64,${logoBase64}`;

        const companyLogoPath = path.join(__dirname, `../../tmp/static/appnestLogo.png`);
        const companyLogoBase64 = fs.readFileSync(companyLogoPath, {
            encoding: "base64",
        });
        const companyLogoSrc = `data:image/png;base64,${companyLogoBase64}`;

        const invoiceData = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Document</title>
        </head>
        <body>
            <div style="padding: 10px 10px;">
                <table style="width: 100%;border-spacing: 0px 0px;">
                    <tr style="width: 100%;">
                        <td style="border: 1px solid black; width: 50%;padding: 10px 50px;">
                            <img src="${logoSrc}" style="width: 6rem;" alt="">
                        </td>
                        <td style="border: 1px solid black; width: 50%;text-align: right;padding: 10px 10px;">
                            <p style="font-size: 20px;font-weight: 900;"><b>Invoice</b></p>
                            <span>Order Number : ${order?.orderNumber}</span><br />
                            <span>Date : ${new Date().toLocaleDateString()}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="border: 1px solid black; padding: 3px 10px;"><p style="font-weight: 800;">Billing From</p></td>
                        <td style="border: 1px solid black; padding: 3px 10px;"><p style="font-weight: 800;">Billing To</p></td>
                    </tr>
                    <tr style="width: 100%;">
                        <td style="border: 1px solid black; width: 50%;padding: 20px 10px;">
                            <span style="font-weight: 800;">Company: <span style="font-weight: 300;"><b>${company?.companyName}</b></span></span><br />
                            ${company?.gstNo?.length > 0 ? `<span style="font-weight: 800;">GSTIN: <span style="font-weight: 300;">${company?.gstNo}</span></span><br />` : ""
            }
                            <span style="font-weight: 800;">Phone: <span style="font-weight: 300;">${company?.contact}</span></span><br />
                            <span style="font-weight: 800;">Email: <span style="font-weight: 300;">${company?.email}</span></span><br />
                            <span style="font-weight: 800;">Address: <span style="font-weight: 300;">${company?.address}</span></span>
                        </td>
                        <td style="border: 1px solid black; width: 50%;padding: 20px 10px;">
                            <span style="font-weight: 800;">Name: <span style="font-weight: 300;"><b>${order?.address?.name || "NIL"}</b></span></span><br />
                            <span style="font-weight: 800;">Phone: <span style="font-weight: 300;">${order?.address?.phone}</span></span><br />
                            <span style="font-weight: 800;">City: <span style="font-weight: 300;">${order?.address?.city}</span></span><br />
                            <span style="font-weight: 800;">State: <span style="font-weight: 300;">${order?.address?.state}</span></span><br />
                            <span style="font-weight: 800;">Pincode: <span style="font-weight: 300;">${order?.address?.pincode}</span></span><br />
                            <span style="font-weight: 800;">House No/Flat No: <span style="font-weight: 300;">${order?.address?.houseNo}</span></span><br />
                            <span style="font-weight: 800;">Landmark: <span style="font-weight: 300;">${order?.address?.landmark}</span></span><br />
                            <span style="font-weight: 800;">Street Address: <span style="font-weight: 300;">${order?.address?.street}</span></span>
                            <span style="font-weight: 800;"></span>
                        </td>
                    </tr>
                </table>
                <table style="width: 100%;border-spacing: 0px 0px;">
                    <thead>
                        <tr style="padding: 8px;text-align: left;">
                            <th colspan="1" style="border: 1px solid black;text-align: center;">SL No</th>
                            <th colspan="5" style="border: 1px solid black;text-align: left;">Items</th>
                            <th colspan="2" style="border: 1px solid black;text-align: center;">Quantity</th>
                            <th colspan="2" style="border: 1px solid black;text-align: center;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${order?.products?.map((product, index) => {
                return `<tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="1" style="border: 1px solid black;text-align: center;">${Number(index) + 1}</th>
                            <td colspan="5" style="border: 1px solid black;text-align: left;padding: 5px 5px">${product?.productTitle}, ${product?.productQuantity || ""}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;">${product?.quantity}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;">₹${Number(product?.totalPrice) * Number(product?.quantity)}</th>
                            </tr>`
            })
            }
                        ${order?.chargeAmount > 0 ? `<tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="6" style="border: 1px solid black;text-align: center;">Total Charges</td>
                            <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.chargeAmount}</td>
                        </tr>` : ""}
                        ${order?.discount > 0 ? `<tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="6" style="border: 1px solid black;text-align: center;">Total Discount</td>
                            <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.discount}</td>
                        </tr>` : ""}
                        ${order?.referDiscount > 0 ? `<tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="6" style="border: 1px solid black;text-align: center;">Total Discount</td>
                            <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.referDiscount}</td>
                        </tr>` : ""}
                        <tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="6" style="border: 1px solid black;text-align: center;">Total Price</th>
                            <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.totalPrice}</th>
                        </tr>
                        <tr style="padding: 8px;text-align: left;width: 100%;">
                            <td colspan="3" style="border: 1px solid black;text-align: center;">In words</th>
                            <td colspan="7" style="border: 1px solid black;text-align: center;">${isNaN(Number(order?.totalPrice)) ? "" : toWords.convert(order?.totalPrice)}</th>
                        </tr>
                    </tbody>
                </table>
                <p style="text-align: center;font-size: 12px;">This invoice is computer-generated. No signature is required.</p>
                <p style="text-align: center;font-size: 12px;">Invoice Designed & Developed by <span style="font-weight: 800;"><img src="${companyLogoSrc}" style="width: 6rem;" alt=""></span></p>
            </div>
        </body>
        </html>`

        const uniqueSuffix = uuidv4();
        const filename = `invoice_${uniqueSuffix}.pdf`;

        const generateData = new URLSearchParams();
        generateData.append("htmlcode", invoiceData);
        generateData.append("filename", filename);

        const response = await axios({
            url: "https://invoice.appnestit.com/",
            method: "post",
            data: generateData,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        });

        const invoiceLink = response.data?.data
        if (!invoiceLink) return res.status(200).json(ApiResponse(200, "Status has been changed but invoice link is not found. Please try to generate in manually."))

        order.invoice = invoiceLink
        await order.save({ validateBeforeSave: false })
    }

    const user = await User.findById(updatedStatus?.userId)

    if (user?.fcmToken && user?.fcmToken !== "") {
        // notificaion
        const notificationPayload = {
            title: `Order ${status}`,
            body: status === "Delivered" ? `Please find your Order Invoice in the app.` : `Your order has been ${status}. View order.`,
            image: updatedStatus?.products[0]?.productImage,
            targetScreen: `Order Details`,
            routeData: paymentId,
            userTokens: user.fcmToken
        }

        await sendPushNotification(notificationPayload)
    }

    if (status === "Canceled") {
        const payment
            = await Payment.findById(paymentId)
        const pointValueInMoney = await Company.findOne()

        let totalMoney = payment?.totalPoints * Number(pointValueInMoney?.pointValueInMoney) / 100 // in paisa 1 rupees = 100 paisa
        const updatedPaymentStatus = await Payment.updateOne(
            { _id: paymentId },
            {
                $set: {
                    paymentStatus: "failed"
                }
            }
        )
        if (updatedPaymentStatus.modifiedCount === 0) return res.status(200).json(ApiError(200, "Status has been changed but payment status not changed"))

        const user = await User.findByIdAndUpdate(
            updatedStatus?.userId,
            {
                $inc: {
                    "wallet.point": -Number(payment?.totalPoints),
                    "wallet.money": -Number(totalMoney)
                }
            }
        )

        if (payment?.isReferredOrder === true) {
            user.isReferUsed = false
            user.usedReferCode = ""
            await user.save({ validateBeforeSave: false })
        }

        return res.status(200).json(ApiResponse(200, "Status has been changed"))
    }

    if (status === "Delivered") {
        const updatedPaymentStatus = await Payment.updateOne(
            { _id: paymentId },
            {
                $set: {
                    paymentStatus: "success"
                }
            }
        )
        if (updatedPaymentStatus.modifiedCount === 0) return res.status(200).json(ApiError(200, "Status has been changed but payment status not changed"))

        if (updatedStatus?.isReferredOrder === true) {
            const referredUser = await User.findById(updatedStatus?.referUserId)
            if (!referredUser) return res.status(404).json(ApiError(404, "Status has been changed but referred user not found"))

            const company = await Company.findOne()
            if (!company) return res.status(404).json(ApiError(404, "Status has been changed but company data not found"))

            const pointPerRefer = company?.pointPerRefer
            if (!pointPerRefer) return res.status(404).json(ApiError(404, "Please set 'Point Per Refer' value first then try again or send the points manually"))

            let totalMoney

            totalMoney = pointPerRefer * Number(company?.pointValueInMoney) / 100

            console.log(totalMoney)

            const updtedReferredUser = await User.findByIdAndUpdate(
                referredUser?._id,
                {
                    $inc: {
                        "wallet.point": Number(pointPerRefer),
                        "wallet.money": Number(totalMoney)
                    }
                }
            )
        }

        return res.status(200).json(ApiResponse(200, "Status has been changed"))
    }

    return res.status(200).json(ApiResponse(200, "Status has been changed"))
})

const generateInvoice = asynchandler(async (req, res) => {
    const { paymentId } = req.params

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const order = await Payment.findById(paymentId)
    const company = await Company.findOne()

    const logoPath = path.join(__dirname, `../../tmp/static/logo.png`);
    const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    const logoSrc = `data:image/png;base64,${logoBase64}`;

    const companyLogoPath = path.join(__dirname, `../../tmp/static/appnestLogo.png`);
    const companyLogoBase64 = fs.readFileSync(companyLogoPath, {
        encoding: "base64",
    });
    const companyLogoSrc = `data:image/png;base64,${companyLogoBase64}`;

    const invoiceData = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div style="padding: 10px 10px;">
        <table style="width: 100%;border-spacing: 0px 0px;">
            <tr style="width: 100%;">
                <td style="border: 1px solid black; width: 50%;padding: 10px 50px;">
                    <img src="${logoSrc}" style="width: 10rem;" alt="">
                </td>
                <td style="border: 1px solid black; width: 50%;text-align: right;padding: 10px 10px;">
                    <p style="font-size: 20px;font-weight: 900;"><b>Invoice</b></p>
                    <span>Order Number : ${order?.orderNumber}</span><br />
                    <span>Invoice Number : ${order?.invoiceId}</span><br />
                    <span>Date : ${new Date().toLocaleDateString()}</span>
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid black; padding: 3px 10px;"><p style="font-weight: 800;">Billing From</p></td>
                <td style="border: 1px solid black; padding: 3px 10px;"><p style="font-weight: 800;">Billing To</p></td>
            </tr>
            <tr style="width: 100%;">
                <td style="border: 1px solid black; width: 50%;padding: 20px 10px;">
                    <span style="font-weight: 800;">Company: <span style="font-weight: 300;"><b>${company?.companyName}</b></span></span><br />
                    <span style="font-weight: 800;">GSTIN: <span style="font-weight: 300;">${company?.gstNo}</span></span><br />
                    <span style="font-weight: 800;">Phone: <span style="font-weight: 300;">${company?.contact}</span></span><br />
                    <span style="font-weight: 800;">Email: <span style="font-weight: 300;">${company?.email}</span></span><br />
                    <span style="font-weight: 800;">Address: <span style="font-weight: 300;">${company?.address}</span></span>
                </td>
                <td style="border: 1px solid black; width: 50%;padding: 20px 10px;">
                    <span style="font-weight: 800;">Name: <span style="font-weight: 300;"><b>${order?.address?.fullName}</b></span></span><br />
                    <span style="font-weight: 800;">Phone: <span style="font-weight: 300;">${order?.address?.phone}</span></span><br />
                    <span style="font-weight: 800;">City: <span style="font-weight: 300;">${order?.address?.city}</span></span><br />
                    <span style="font-weight: 800;">State: <span style="font-weight: 300;">${order?.address?.state}</span></span><br />
                    <span style="font-weight: 800;">Pincode: <span style="font-weight: 300;">${order?.address?.pincode}</span></span><br />
                    <span style="font-weight: 800;">Billing Address: <span style="font-weight: 300;">${order?.address?.streetName1}, ${order?.address?.streetName2}</span></span>
                    <span style="font-weight: 800;"></span>
                </td>
            </tr>
        </table>
        <table style="width: 100%;border-spacing: 0px 0px;">
            <thead>
                <tr style="padding: 8px;text-align: left;">
                    <th colspan="1" style="border: 1px solid black;text-align: center;">SL No</th>
                    <th colspan="5" style="border: 1px solid black;text-align: left;">Items</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center;">Quantity</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center;">Price</th>
                </tr>
            </thead>
            <tbody>
                ${order?.products?.map((product, index) => {
        return `<tr style="padding: 8px;text-align: left;width: 100%;">
                    <td colspan="1" style="border: 1px solid black;text-align: center;">${Number(index) + 1}</th>
                    <td colspan="5" style="border: 1px solid black;text-align: left;padding: 5px 5px">${product?.productTitle}, ${product?.productQuantity}</th>
                    <td colspan="2" style="border: 1px solid black;text-align: center;">${product?.quantity}</th>
                    <td colspan="2" style="border: 1px solid black;text-align: center;">₹${product?.totalPrice}</th>
                    </tr>`
    })
        }
                ${order?.chargeAmount > 0 ? `<tr style="padding: 8px;text-align: left;width: 100%;">
                    <td colspan="6" style="border: 1px solid black;text-align: center;">Total Charges</td>
                    <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.chargeAmount}</td>
                </tr>` : ""}
                ${order?.discount > 0 ? `<tr style="padding: 8px;text-align: left;width: 100%;">
                    <td colspan="6" style="border: 1px solid black;text-align: center;">Total Discount</td>
                    <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.discount}</td>
                </tr>` : ""}
                <tr style="padding: 8px;text-align: left;width: 100%;">
                    <td colspan="6" style="border: 1px solid black;text-align: center;">Total Price</th>
                    <td colspan="4" style="border: 1px solid black;text-align: center;">₹${order?.totalPrice}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;width: 100%;">
                    <td colspan="3" style="border: 1px solid black;text-align: center;">In words</th>
                    <td colspan="7" style="border: 1px solid black;text-align: center;">${isNaN(Number(order?.totalPrice)) ? "" : toWords.convert(order?.totalPrice)}</th>
                </tr>
            </tbody>
        </table>
        <p style="text-align: center;font-size: 12px;">This invoice is computer-generated. No signature is required.</p>
        <p style="text-align: center;font-size: 12px;">Invoice Designed & Developed by <span style="font-weight: 800;"><img src="${companyLogoSrc}" style="width: 6rem;" alt=""></span></p>
    </div>
</body>
</html>`

    const uniqueSuffix = uuidv4();
    const filename = `invoice_${uniqueSuffix}.pdf`;

    const generateData = new URLSearchParams();
    generateData.append("htmlcode", invoiceData);
    generateData.append("filename", filename);

    const response = await axios({
        url: "https://invoice.appnestit.com/",
        method: "post",
        data: generateData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    const invoiceLink = response.data?.data
    if (!invoiceLink) return res.status(404).json(ApiError(404, "Invoice link not found"))

    order.invoice = invoiceLink
    await order.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(ApiResponse(200, "Report generated", { link: response.data.data }));
})

const getReferredOrders = asynchandler(async (req, res) => {
    const { search } = req.query
    const { page, city, typeOfStore } = req.params
    let orders
    let data
    let totalPage

    if (search && search?.length > 0) {
        const searchReg = new RegExp(search, "i")
        orders = await Payment.aggregate([
            {
                $match: {
                    city: city,
                    typeOfStore: typeOfStore
                }
            },
            {
                $match: {
                    isReferredOrder: true
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "referUserId",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $addFields: {
                    username: {
                        $first: "$user.fullName"
                    },
                    userPhone: {
                        $first: "$user.phone"
                    }
                }
            },
            {
                $match: {
                    $or: [
                        { username: searchReg },
                        { userPhone: searchReg }
                    ]
                }
            },
            {
                $sort: {
                    _id: -1
                }
            }
        ])

        return res.status(200).json(ApiResponse(200, "Data fetched", data))
    } else {
        orders = await Payment.aggregate([
            {
                $match: {
                    isReferredOrder: true,
                    city: city,
                    typeOfStore: typeOfStore
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "referUserId",
                    foreignField: "_id",
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
    }
    if (orders?.length === 0) return res.status(200).json(ApiResponse(200, "Orders fetched", orders))

    try {
        const { newData, totalPages } = pagination(page, 20, orders)
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

const deleteOrderData = asynchandler(async (req, res) => {
    const {orderId} = req.params

    const deletedOrder = await Payment.findByIdAndDelete(orderId)
    if (!deletedOrder) {
        return res.status(404).json(ApiError(
            404, "Order not found"
        ))
    }

    return res.status(200).json(ApiResponse(200, "Order has been deleted"))
})

export {
    checkout,
    myOrders,
    getSingleOrderStaff,
    getSingleOrderUser,
    allOrdersStaff,
    changeDelivaryStatus,
    generateInvoice,
    getReferredOrders,
    allOrdersSuperadmin,
    deleteOrderData
}
