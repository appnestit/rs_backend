import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { ToWords } from "to-words";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";
import { Payment } from "../models/payment.model.js";
import { pagination } from "../utils/pagination.js";

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


const generateDailyReport = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params
    const { keywords, search, startDate, endDate } = req.query
    let aggregationArray = []

    // console.log(startDate)

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

    const data = await Payment.aggregate(aggregationArray)

    console.log(data)
    console.log(startDate)
    console.log(endDate)
    console.log(search)

    if (!Array.isArray(data)) return res.status(400).json(ApiError(400, "Data must be an array"))

    // ========================== Report Part =========================================

    // finding some total values
    let totalPriceWODiscount = 0
    let totalQuantity = 0
    let totalDiscount = 0
    let totalPriceWDiscount = 0

    data?.map((item) => {
        if (Array.isArray(item?.products)) {
            item?.products?.map((product) => {
                totalPriceWODiscount += product?.totalPrice || 0
                totalQuantity += product?.quantity || 0
            })
        }

        // totalPriceWDiscount += item?.totalPrice || 0
        totalDiscount += item?.discount || 0
    })

    // total price with discount
    totalPriceWDiscount = Number(totalPriceWODiscount) + Number(totalDiscount)

    // logo settings
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const logoPath = path.join(__dirname, `../../tmp/static/logo.png`);
    const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    const logoSrc = `data:image/png;base64,${logoBase64}`;

    const companyLogoPath = path.join(__dirname, `../../tmp/static/appnestLogo.png`);
    const companyLogoBase64 = fs.readFileSync(companyLogoPath, {
        encoding: "base64",
    });
    const companyLogoSrc = `data:image/png;base64,${companyLogoBase64}`;

    const reportHtml = `<!DOCTYPE html>
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
                    <p style="font-size: 20px;font-weight: 900;"><b>Daily Report</b></p>
                    <span>Date : ${new Date().toLocaleDateString()}</span>
                </td>
            </tr>
        </table>
        <table style="width: 100%;border-spacing: 0px 0px;">
            <thead>
                <tr style="padding: 8px;text-align: left;">
                    <th colspan="1" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Date</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Order No</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Name</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Phone No</th>
                    <th colspan="5" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Products</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Quantity</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Price</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Discount</th>
                    <th colspan="3" style="border: 1px solid black;text-align: center; font-size: small;padding: 8px">Total Price</th>
                </tr>
            </thead>
            <tbody>
                ${data?.map((item) => {
        return `<tr style="padding: 8px;text-align: left;width: 100%;">
                                <td colspan="1" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${new Date(item?.date).toLocaleDateString()}</th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${item?.orderNumber}</th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${item?.address?.name || "NIL"}</th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${item?.address?.phone || "NIL"}</th>
                                <td colspan="5" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">
                                    ${item?.products?.map((product) => {
            return `<span>${`${product?.productTitle} ${product?.productQuantity || ""}`}</span><br />`
        }).join("")}
                                </th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">
                                    ${item?.products?.map((product) => {
            return `<span>${product?.quantity}</span><br />`
        }).join("")}
                                </th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">
                                    ${item?.products?.map((product) => {
            return `<span>${product?.totalPrice}</span><br />`
        }).join("")}
                                </th>
                                <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${item?.discount || 0}</th>
                                <td colspan="3" style="border: 1px solid black;text-align: center;font-size: small;padding: 8px">${item?.totalPrice}</th>
                            </tr>`
    })
        }
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="15" style="border: 1px solid black;text-align: center; font-size: small;">Total Quantity</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalQuantity}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="15" style="border: 1px solid black;text-align: center; font-size: small;">Total Price(without discount)</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalPriceWODiscount}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="15" style="border: 1px solid black;text-align: center; font-size: small;">Total Discount</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalDiscount}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="15" style="border: 1px solid black;text-align: center; font-size: small;">Total Price(with discount)</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalPriceWDiscount}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="15" style="border: 1px solid black;text-align: center; font-size: small;">In words</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center;font-size: 15px; font-size: small;">${isNaN(Number(totalPriceWDiscount)) ? "" : toWords.convert(totalPriceWDiscount)}</th>
                </tr>
            </tbody>
        </table>
        <p style="text-align: center;font-size: 12px;">This invoice is computer-generated. No signature is required.</p>
        <p style="text-align: center;font-size: 12px;">Invoice Designed & Developed by <span style="font-weight: 800;"><img src="${companyLogoSrc}" style="width: 6rem;" alt=""></span></p>
    </div>
</body>
</html>`

    const uniqueSuffix = uuidv4();
    const filename = `daily_report_${uniqueSuffix}.pdf`;

    const generateData = new URLSearchParams();
    generateData.append("htmlcode", reportHtml);
    generateData.append("filename", filename);

    const response = await axios({
        url: "https://invoice.appnestit.com/landscap.php",
        method: "post",
        data: generateData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    // console.log(response?.data)

    if (response.data?.data === undefined) return res.status(404).json(ApiError(404, "Report link not found"))

    // return res.redirect(302, response.data?.data)

    return res.status(200).json(ApiResponse(200, "Report generated", response?.data))
})

const productSellingHistory = asynchandler(async (req, res) => {
    const { page, typeOfStore } = req.params
    const { productName, startDate, endDate, city, paymentMethod } = req.query
    let aggregationArrayPosStart = []
    let aggregationArrayPosEnd = []

    let data
    let totalPage
    let rawData

    const mandatoryMatch = {
        $match: {
            typeOfStore: typeOfStore,
            paymentStatus: "success"
        }
    }

    aggregationArrayPosStart.push(mandatoryMatch)

    if (typeof paymentMethod === "string" && paymentMethod?.trim() !== "") {
        const aggregationObject = {
            $match: {
                paymentMethod: paymentMethod
            }
        }

        aggregationArrayPosStart.push(aggregationObject)
    }

    if (typeof city === "string" && city?.trim() !== "") {
        const aggregationObject = {
            $match: {
                city: city
            }
        }

        aggregationArrayPosStart.push(aggregationObject)
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

        aggregationArrayPosStart.push(aggregationObject)
    }

    if (typeof productName === "string" && productName?.trim() !== "") {
        const productNameReg = new RegExp(productName, "i")

        const aggregationObject = {
            $match: {
                productTitle: productNameReg
            }
        }

        aggregationArrayPosEnd.push(aggregationObject)
    }

    const mainAggrregation = [
        ...aggregationArrayPosStart,
        {
            $project: {
                products: 1,
                dateAndTime: 1
            }
        },
        {
            $unwind: {
                path: "$products"
            }
        },
        {
            $addFields: {
                productTitle: "$products.productTitle",
                productPrice: "$products.totalPrice",
                quantity: "$products.quantity",
                sellingPrice:
                    "$products.productVariant.sellingPrice",
                mrp: "$products.productVariant.mrp"
            }
        },
        {
            $addFields: {
                totalPrice: {
                    $multiply: ["$productPrice", "$quantity"]
                }
            }
        },
        ...aggregationArrayPosEnd
    ]

    const result = await Payment.aggregate(mainAggrregation)
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

const generateProductReport = asynchandler(async (req, res) => {
    const { data } = req.body

    if (!Array.isArray(data)) return res.status(400).json(ApiError(400, "Data must be an array"))

    let totalQuantity = 0
    let totalSell = 0

    data?.map((item) => {
        totalSell += isNaN(Number(item?.totalPrice)) ? 0 : Number(item?.totalPrice)
        totalQuantity += isNaN(Number(item?.quantity)) ? 0 : Number(item?.quantity)
    })

    // logo settings
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const logoPath = path.join(__dirname, `../../tmp/static/logo.png`);
    const logoBase64 = fs.readFileSync(logoPath, { encoding: "base64" });
    const logoSrc = `data:image/png;base64,${logoBase64}`;

    const companyLogoPath = path.join(__dirname, `../../tmp/static/appnestLogo.png`);
    const companyLogoBase64 = fs.readFileSync(companyLogoPath, {
        encoding: "base64",
    });
    const companyLogoSrc = `data:image/png;base64,${companyLogoBase64}`;

    const reportHtml = `<!DOCTYPE html>
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
                    <p style="font-size: 20px;font-weight: 900;"><b>Product Report</b></p>
                    <span>Date : ${new Date().toLocaleDateString()}</span>
                </td>
            </tr>
        </table>
        <table style="width: 100%;border-spacing: 0px 0px;">
            <thead>
                <tr style="padding: 8px;text-align: left;">
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Date</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Product Type</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Product Name</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">MRP</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Selling Price</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Product Price</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Quantity</th>
                    <th colspan="2" style="border: 1px solid black;text-align: center; font-size: small;">Total Price</th>
                </tr>
            </thead>
            <tbody>
                ${data?.map((item) => {
        return `
                        <tr style="padding: 8px;text-align: left;">
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${new Date(item?.dateAndTime).toLocaleDateString()}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.products?.cartType || ""}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.productTitle}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.mrp || "N/A"}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.sellingPrice || "N/A"}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.productPrice}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.quantity}</th>
                            <td colspan="2" style="border: 1px solid black;text-align: center;font-size: small;">${item?.totalPrice}</th>
                        </tr>
                    `
    })}
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="10" style="border: 1px solid black;text-align: center; font-size: small;">Total Quantity</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalQuantity}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="10" style="border: 1px solid black;text-align: center; font-size: small;">Total Price</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center; font-size: small;">${totalSell}</th>
                </tr>
                <tr style="padding: 8px;text-align: left;">
                    <td colspan="10" style="border: 1px solid black;text-align: center; font-size: small;">In words</th>
                    <td colspan="6" style="border: 1px solid black;text-align: center;font-size: 15px; font-size: small;">${isNaN(Number(totalSell)) ? "" : toWords.convert(totalSell)}</th>
                </tr>
            </tbody>
        </table>
        <p style="text-align: center;font-size: 12px;">This invoice is computer-generated. No signature is required.</p>
        <p style="text-align: center;font-size: 12px;">Invoice Designed & Developed by <span style="font-weight: 800;"><img src="${companyLogoSrc}" style="width: 6rem;" alt=""></span></p>
    </div>
</body>
</html>`

    const uniqueSuffix = uuidv4();
    const filename = `product_report_${uniqueSuffix}.pdf`;

    const generateData = new URLSearchParams();
    generateData.append("htmlcode", reportHtml);
    generateData.append("filename", filename);

    const response = await axios({
        url: "https://invoice.appnestit.com/landscap.php",
        method: "post",
        data: generateData,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });

    // console.log(response?.data)

    if (response.data?.data === undefined) return res.status(404).json(ApiError(404, "Report link not found"))

    // return res.redirect(302, response.data?.data)

    return res.status(200).json(ApiResponse(200, "Report generated", response?.data))

})

export {
    generateDailyReport,
    productSellingHistory,
    generateProductReport
}