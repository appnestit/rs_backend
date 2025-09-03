import mongoose from "mongoose";
import { Company } from "../models/company.model.js";
import { Catagory, Product, Review, Section, Subcategory, VideoReview } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import { pagination } from "../utils/pagination.js";
import { User } from "../models/user.models.js";
import jwt from "jsonwebtoken"
import { ProductActive } from "../models/productActive.model.js";

// products APIs
const addProduct = asynchandler(async (req, res) => {
    const { typeOfStore, subcategory, ...fields } = req.body
    let productFields = {}

    const company = await Company.findOneAndUpdate(
        {},
        {
            $inc: {
                totalProduct: 1
            }
        }
    )
    if (!company) return res.status(404).json(ApiError(404, "Company not found"))

    const productNo = Number(company.totalProduct) + 1

    productFields = { typeOfStore: req?.user?.typeOfStore, productSLNumber: productNo, ...fields }

    if (subcategory !== undefined && subcategory?.trim() !== "") {
        productFields = { ...productFields, subcategory: subcategory }
    }

    const newProduct = await Product.create({
        ...productFields
    })
    if (!newProduct) return res.status(500).json(ApiError(500, "Product save failed"))

    return res.status(200).json(ApiResponse(200, "Product added successfully", newProduct))
})

const updateProduct = asynchandler(async (req, res) => {
    const { productId } = req.body
    const fields = req.body
    let updateData = {}

    if (!productId) return res.status(404).json(ApiError(404, "Product id not found"))

    Object.keys(fields).forEach(key => {
        if (
            fields[key] !== undefined &&
            fields[key] !== null &&
            (typeof fields[key] === "boolean" || fields[key]?.length > 0)
        ) {
            updateData[key] = fields[key];
        }
    });


    console.log(updateData)

    const product = await Product.findOneAndUpdate(
        { _id: productId },
        {
            $set: updateData
        },
        {
            new: true
        }
    )
    if (product?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Product save failed"))

    return res.status(200).json(ApiResponse(200, "Product updated", product))
})

const deleteProduct = asynchandler(async (req, res) => {
    const { productId } = req.params

    const deletedProduct = await Product.deleteOne({ _id: productId })
    if (!deletedProduct) return res.status(500).json(ApiError(500, "Product delete failed"))

    return res.status(200).json(ApiResponse(200, "Product deleted successfully"))
})

const addImage = asynchandler(async (req, res) => {
    const { productId } = req.body
    if (req?.files === undefined) return res.status(400).json(ApiError(400, "Files are required"))

    let filenames = []

    const imgArray = req.files
    imgArray.forEach(element => {
        if (element?.filename !== undefined) {
            filenames.push(element?.filename)
        }
    });

    const product = await Product.findOneAndUpdate(
        { _id: productId },
        {
            $push: {
                images: filenames
            }
        },
        {
            new: true
        }
    )
    if (product?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Image upload failed"))

    return res.status(200).json(ApiResponse(200, "Images uploaded successfully", product))
})

const deleteImage = asynchandler(async (req, res) => {
    const { productId, imageUrl } = req.params

    const deletedImage = await Product.findOneAndUpdate(
        { _id: productId },
        {
            $pull: {
                images: imageUrl
            }
        },
        {
            new: true
        }
    )
    if (deletedImage?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Image delete failed"))

    return res.status(200).json(ApiResponse(200, "Image deleted successfully", deletedImage))
})

const addVariant = asynchandler(async (req, res) => {
    const { productId, value, unit, mrp, sellingPrice, specialPrice, discount, isSpecialPriceActive, isActive } = req.body

    console.log(req.body)

    if (!productId || !value || !sellingPrice) return res.status(400).json(ApiError(400, "All fields are required"))

    const variantId = `VAR${Math.floor(1000 + (Math.random() * 9000))}`

    const product = await Product.findOneAndUpdate(
        { _id: productId },
        {
            $push: {
                variant: {
                    value: value,
                    unit: unit || "",
                    variantId: variantId,
                    mrp: mrp,
                    sellingPrice: sellingPrice,
                    discount: discount,
                    specialPrice: specialPrice,
                    isSpecialPriceActive: isSpecialPriceActive,
                    isActive: isActive
                }
            }
        },
        {
            new: true
        }
    )
    if (product?.modifiedCount) return res.status(500).json(ApiError(500, "Variant not added"))

    return res.status(200).json(ApiResponse(200, "Variant added succssfully", product))
})

const updateVariant = asynchandler(async (req, res) => {
    const { productId, variantId } = req.body;
    const fields = req.body;

    let updateData = {};

    // validation
    if (!productId || !variantId) {
        return res
            .status(400)
            .json(ApiError("Product ID and variant Id are required"));
    }

    // object manipulation for db alteration
    Object.keys(fields).map((key) => {
        const data = fields[key]
        if (
            (typeof data === "string" && data !== "") ||
            (!isNaN(Number(data))) ||
            (typeof data === "boolean")
        ) {
            updateData[`variant.$.${key}`] = data
        }
    });

    const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, "variant.variantId": variantId }, {
        $set: {
            ...updateData
        }
    }, {
        new: true
    }
    )
    if (!updatedProduct) {
        return res.status(404).json(ApiError("Product not found"))
    }

    return res
        .status(200)
        .json(
            ApiResponse(200, "Add-on product has been updated", updatedProduct)
        );
})

const deleteVariant = asynchandler(async (req, res) => {
    const { productId, variantId } = req.params

    const product = await Product.findOneAndUpdate(
        { _id: productId },
        {
            $pull: {
                variant: {
                    variantId: variantId
                }
            }
        },
        {
            new: true
        }
    )
    if (product?.modifiedCount) return res.status(500).json(ApiError(500, "Variant not deleted"))

    return res.status(200).json(ApiResponse(200, "Variant delete succssfully", product))
})

// catagory APIs

const addCatagory = asynchandler(async (req, res) => {
    const { name, sectionId, typeOfStore, foodType } = req.body
    if (req?.file === undefined) return res.status(400).json(ApiError(400, "Image is required"))

    const { filename } = req.file

    const newCatagory = await Catagory.create({
        name: name,
        image: filename,
        sectionId: sectionId,
        typeOfStore: typeOfStore,
        foodType: foodType
    })
    if (!newCatagory) return res.status(500).json(ApiError(500, "Catagory create failed"))

    return res.status(200).json(ApiResponse(200, "Catagory created successfully"))
})

const updateCatagory = asynchandler(async (req, res) => {
    const { catagoryId, name, sectionId, status, foodType, typeOfStore } = req.body
    let updateData = {}

    if (!catagoryId) return res.status(400).json(ApiError(400, "Catagory id is required"))

    if (name !== undefined && name !== "") {
        updateData["name"] = name
    }
    if (sectionId !== undefined && sectionId !== "") {
        updateData["sectionId"] = sectionId
    }
    if (typeOfStore !== undefined && typeOfStore !== "") {
        updateData["typeOfStore"] = typeOfStore
    }
    if (foodType !== undefined && foodType !== "") {
        updateData["foodType"] = foodType
    }
    if (req?.file !== undefined) {
        const { filename } = req.file
        updateData["image"] = filename
    }
    if (status !== undefined) {
        updateData["isActive"] = status
    }

    const catagory = await Catagory.findOneAndUpdate(
        { _id: catagoryId },
        {
            $set: updateData
        },
        {
            new: true
        }
    )
    if (catagory?.modifiedCount) return res.status(500).json(ApiError(500, "Catagory update failed"))

    return res.status(200).json(ApiResponse(200, "Catagory updated successfully", catagory))
})

const deleteCatagory = asynchandler(async (req, res) => {
    const { catagoryId } = req.params

    const deletedCatagory = await Catagory.deleteOne({ _id: catagoryId })
    if (deletedCatagory.deletedCount === 0) return res.status(500).json(ApiError(500, "Catagory delete failed"))

    return res.status(200).json(ApiResponse(200, "Catagory deleted successfully"))
})

// section APIs
const addSection = asynchandler(async (req, res) => {
    const { name, foodType, typeOfStore } = req.params

    const newSection = await Section.create({
        name: name,
        foodType: foodType,
        typeOfStore: typeOfStore
    })
    if (!newSection) return res.status(500).json(ApiError(500, "Section create failed"))

    return res.status(200).json(ApiResponse(200, "Section created successfully"))
})

const updateSection = asynchandler(async (req, res) => {
    const { sectionId, name, foodType, typeOfStore } = req.body
    let updateData = {}

    if (name !== undefined && name !== "") {
        updateData["name"] = name
    }
    if (foodType !== undefined && foodType !== "") {
        updateData["foodType"] = foodType
    }
    if (typeOfStore !== undefined && typeOfStore !== "") {
        updateData["typeOfStore"] = typeOfStore
    }

    const updatedSection = await Section.updateOne(
        { _id: sectionId },
        {
            $set: {
                ...updateData
            }
        }
    )

    return res.status(200).json(ApiResponse(200, "Section updated"))
})

const deleteSection = asynchandler(async (req, res) => {
    const { sectionId } = req.params

    const deletedSection = await Section.deleteOne({ _id: sectionId })
    if (deletedSection.deletedCount === 0) return res.status(500).json(ApiError(500, "Section delete failed"))

    return res.status(200).json(ApiResponse(200, "Section deleted successfully"))
})

// subcategory APIs
const addSubcategory = asynchandler(async (req, res) => {
    const { name, categoryId, foodType, typeOfStore } = req.body

    if (req?.file === undefined || !name) return res.status(400).json(ApiError(400, "Image and name is important"))

    const { filename } = req.file

    const newSubcategory = await Subcategory.create({
        name: name,
        image: filename,
        catagoryId: categoryId,
        foodType: foodType,
        typeOfStore: typeOfStore
    })
    if (!newSubcategory) return res.status(500).json(ApiError(500, "Subcategory add failed"))

    return res.status(200).json(ApiResponse(200, "Subcategory added"))
})

const updateSubcategory = asynchandler(async (req, res) => {
    const { name, isActive, subCategoryId, categoryId, foodType } = req.body
    let updateData = {}

    if (req?.file !== undefined) {
        const { filename } = req.file
        updateData["image"] = filename
    }

    if (name !== undefined) updateData["name"] = name
    if (isActive !== undefined) updateData["isActive"] = isActive
    if (categoryId !== undefined) updateData["catagoryId"] = categoryId
    if (foodType !== undefined) updateData["foodType"] = foodType

    const updatedSubcategory = await Subcategory.updateOne(
        { _id: subCategoryId },
        {
            $set: updateData
        }
    )

    return res.status(200).json(ApiResponse(200, "Subcategory updated"))
})

const deleteSubcategory = asynchandler(async (req, res) => {
    const { sectionId } = req.params

    const deletedSubc = await Subcategory.deleteOne({ _id: sectionId })
    if (deletedSubc.deletedCount === 0) return res.status(500).json(ApiError(500, "Subcategory delete failed"))

    return res.status(200).json(ApiResponse(200, "Subcategory deleted"))
})

// add on products
const addAddOnProduct = asynchandler(async (req, res) => {
    const { title, price, foodType, productId } = req.body;

    // validation
    if (!productId || !title) {
        return res.status(400).json(ApiError("Product ID and title are required"));
    }
    if (isNaN(Number(price))) {
        return res.status(400).json(ApiError("Price should be a number"));
    }

    // generating add-on id
    const addOnId = `VAR${Math.floor(1000 + Math.random() * 9999)}`

    const dataObj = {
        addOnProducts: {
            title: title || "",
            price: price,
            foodType: foodType,
            addOnId: addOnId,
            isEnable: true,
        },
    };

    const updatedProduct = await Product.findByIdAndUpdate(
        productId, {
        $push: {
            ...dataObj
        },
    }, {
        new: true
    }
    )
    if (!updatedProduct) {
        return res.status(404).json(ApiError("Product not found"))
    }

    return res
        .status(200)
        .json(
            ApiResponse(200, "Add-on has been added", updatedProduct)
        );
});

const editAddOnProduct = asynchandler(async (req, res) => {
    const { productId, addOnId } = req.body;
    const fields = req.body;

    let updateData = {};

    // validation
    if (!productId || !addOnId) {
        return res
            .status(400)
            .json(ApiError("Product ID and add-on Id are required"));
    }

    // object manipulation for db alteration
    Object.keys(fields).map((key) => {
        const data = fields[key]
        if (
            (typeof data === "string" && data !== "") ||
            (!isNaN(Number(data))) ||
            (typeof data === "boolean")
        ) {
            updateData[`addOnProducts.$.${key}`] = data
        }
    });

    const updatedProduct = await Product.findOneAndUpdate(
        { _id: productId, "addOnProducts.addOnId": addOnId }, {
        $set: {
            ...updateData
        }
    }, {
        new: true
    }
    )
    if (!updatedProduct) {
        return res.status(404).json(ApiError("Product not found"))
    }

    return res
        .status(200)
        .json(
            ApiResponse(200, "Add-on product has been updated", updatedProduct)
        );
});

const deleteAddOnProduct = asynchandler(async (req, res) => {
    const { productId, addOnId } = req.body;

    if (!productId || !addOnId) {
        return res
            .status(400)
            .json(ApiError("Product ID and add on ID are required"));
    }

    const dataObj = {
        addOnProducts: {
            addOnId: addOnId,
        },
    };

    const updatedProduct = await Product.findByIdAndUpdate(
        productId, {
        $pull: {
            ...dataObj
        }
    }, {
        new: true
    }
    )
    if (!updatedProduct) {
        return res.status(404).json(ApiError("Product not found"))
    }

    return res
        .status(200)
        .json(
            ApiResponse(
                200, "Add-on product has been deleted", updatedProduct
            )
        );
});

// review APIs
const addReview = asynchandler(async (req, res) => {
    const { rating, comment, productId, date } = req.body

    if (!rating) return res.status(400).json(ApiError(400, "Rating is required"))

    // get and set avg rating of the product here
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json(ApiError(404, "Product not found"))

    const currentRating = product.avgRating
    const newRating = (Number(rating) + currentRating) / 2
    let updatedRating = 0

    // if 3.1 then rating will be 3, if 3.7 then it will be 4
    const splitedRating = newRating.toString().split(".")
    if (Array.isArray(splitedRating)) {
        if (Number(splitedRating[1]) > 5) {
            updatedRating = Math.ceil(Number(newRating))
        } else {
            updatedRating = Math.floor(Number(newRating))
        }
    } else {
        updatedRating = newRating
    }

    product.avgRating = Number(updatedRating)
    product.totalReview = Number(product.totalReview) + 1
    await product.save({ validateBeforeSave: false })

    const newReview = await Review.create({
        rating: rating,
        comment: comment,
        date: date,
        userid: req.user?._id,
        product: productId,
        userImg: req.user?.image,
        username: req.user?.fullName
    })
    if (!newReview) return res.status(500).json(ApiError(500, "Review add failed"))

    return res.status(200).json(ApiResponse(200, "Review added"))
})

const deleteReview = asynchandler(async (req, res) => {
    const { reviewId } = req.params

    const deletedReview = await Review.deleteOne({ _id: reviewId, userId: req.user?._id })
    if (deletedReview?.deletedCount) return res.status(500).json(ApiError(500, "Review not deleted"))

    return res.status(200).json(ApiResponse(200, "Review deleted"))
})

// video review APIs
// disabled
const addVideo = asynchandler(async (req, res) => {
    const { url, fullname, about, productId } = req.body

    const newReview = await VideoReview.create({
        url: url,
        fullName: fullname,
        about: about,
        productId: productId
    })
    if (!newReview) return res.status(500).json(ApiError(500, "Video review add failed"))

    return res.status(200).json(ApiResponse(200, "Video url added"))
})

const editVideo = asynchandler(async (req, res) => {
    const { videoId } = req.body
    const fields = req.body
    let updateData = {}

    if (!videoId) return res.status(404).json(ApiError(404, "Video id not found"))

    Object.keys(fields).forEach(key => {
        if (fields[key] !== undefined || fields[key]?.length > 0 || fields[key] !== null) {
            updateData[key] = fields[key]
        }
    })

    const video = await VideoReview.findOneAndUpdate(
        { _id: videoId },
        {
            $set: updateData
        },
        {
            new: true
        }
    )
    if (video?.modifiedCount === 0) return res.status(500).json(ApiError(500, "Video save failed"))

    return res.status(200).json(ApiResponse(200, "Video updated"))
})

const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params

    const deletedReview = await VideoReview.deleteOne({ _id: videoId })

    return res.status(200).json(ApiResponse(200, "Deleted successfully"))
})

const getVideoByProduct = asynchandler(async (req, res) => {
    const { productId } = req.params
    const videos = await VideoReview.find({ productId: productId }).sort({ _id: -1 })

    return res.status(200).json(ApiResponse(200, "Videos fetched", videos))
})

const getAllVideos = asynchandler(async (req, res) => {
    const { limit } = req.params
    if (isNaN(Number(limit))) return res.status(500).json(ApiResponse(500, "Limit should be a number"))

    const videos = await VideoReview.aggregate([
        {
            $sort: {
                _id: -1
            }
        },
        {
            $limit: Number(limit)
        },
        {
            $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $addFields: {
                product: {
                    $first: "$product"
                }
            }
        },
        {
            $project: {
                product: {
                    images: 1,
                    variant: 1,
                    title: 1,
                    subTitle: 1,
                    avgRating: 1,
                    catagory: 1,
                    keyward: 1
                },
                url: 1,
                fullName: 1,
                about: 1,
                productId: 1
            }
        }
    ])

    return res.status(200).json(ApiResponse(200, "Videos fetched", videos))
})

// data fetch APIs

const getCatagories = asynchandler(async (req, res) => {
    const { page, limit, typeOfStore } = req.params
    const { foodType, isActive } = req.query
    let data
    let totalPage
    let aggregationObject = {
        typeOfStore: typeOfStore,
        isActive: true
    }

    if (typeof foodType === "string" && foodType.trim() !== "") {
        aggregationObject = {
            ...aggregationObject,
            foodType: foodType
        }
    }

    if (typeof isActive === "string" && isActive.trim() !== "") {
        const isActiveBool = isActive === "true" ? true : false

        aggregationObject = {
            ...aggregationObject,
            isActive: isActiveBool
        }
    }

    if (isNaN(Number(limit))) return res.status(400).json(ApiError(400, "Limit should be a number"))

    const catagories = await Catagory.find({ ...aggregationObject }).sort({ catagorySLNumber: -1 })
    if (catagories?.length === 0) return res.status(200).json(ApiResponse(200, "Catagories fetched", catagories))

    try {
        const { newData, totalPages } = pagination(page, Number(limit), catagories)
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

    return res.status(200).json(ApiResponse(200, "Catagories fetched", finalData))
})

// for product uploading form
const getAllCatagories = asynchandler(async (req, res) => {
    const { sectionId, isGetAll } = req.query
    const { typeOfStore } = req.params

    if (sectionId?.length > 0 && sectionId !== undefined) {
        const catagories = await Catagory.aggregate([
            {
                $match: {
                    sectionId: new mongoose.Types.ObjectId(sectionId),
                    isActive: true
                }
            },
            {
                '$lookup': {
                    'from': 'sections',
                    'localField': 'sectionId',
                    'foreignField': '_id',
                    'as': 'section'
                }
            }, {
                '$addFields': {
                    'section': {
                        '$first': '$section'
                    }
                }
            },
            {
                $sort: {
                    _id: -1
                }
            }
        ])
        return res.status(200).json(ApiResponse(200, "Catagories fetched", catagories))
    }

    let catagories

    if (isGetAll && isGetAll === "true") {
        catagories = await Catagory.aggregate([
            {
                $match: {
                    typeOfStore: typeOfStore
                }
            },
            {
                '$lookup': {
                    'from': 'sections',
                    'localField': 'sectionId',
                    'foreignField': '_id',
                    'as': 'section'
                }
            }, {
                '$addFields': {
                    'section': {
                        '$first': '$section'
                    }
                }
            },
            {
                $sort: {
                    _id: -1
                }
            }
        ])
    } else {
        catagories = await Catagory.aggregate([
            {
                $match: {
                    isActive: true,
                    typeOfStore: typeOfStore
                }
            },
            {
                '$lookup': {
                    'from': 'sections',
                    'localField': 'sectionId',
                    'foreignField': '_id',
                    'as': 'section'
                }
            }, {
                '$addFields': {
                    'section': {
                        '$first': '$section'
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
    return res.status(200).json(ApiResponse(200, "Catagories fetched", catagories))
})

const getAllSection = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params
    const sections = await Section.aggregate([
        {
            $match: {
                typeOfStore: typeOfStore
            }
        },
        {
            $lookup: {
                from: "catagories",
                let: { sectionId: "$_id" },
                pipeline: [
                    { $match: { $expr: { $and: [{ $eq: ["$sectionId", "$$sectionId"] }, { $eq: ["$isActive", true] }] } } }
                ],
                as: "categories"
            }
        },
        {
            $sort: {
                _id: -1
            }
        }
    ]);


    return res.status(200).json(ApiResponse(200, "Sections fetched", sections))
})

const getAllSubcategories = asynchandler(async (req, res) => {
    const { categoryId } = req.query

    if (categoryId?.length > 0 && categoryId !== undefined) {
        const subcatagories = await Subcategory.find({ catagoryId: categoryId, isActive: true }).sort({ _id: -1 })
        return res.status(200).json(ApiResponse(200, "Subcatagories fetched", subcatagories))
    }

    const subcatagories = await Subcategory.find().sort({ _id: -1 })
    return res.status(200).json(ApiResponse(200, "Subcatagories fetched", subcatagories))
})

const getProducts = asynchandler(async (req, res) => {
    const { subcatagory, search, keyward, category, foodType, city, priceFrom, priceTo } = req.query
    const { page, limit, typeOfStore } = req.params
    let splittedData, totalPage, user
    let aggregationArray = []

    if (isNaN(Number(limit)) || isNaN(Number(page))) return res.status(400).json(ApiError(400, "Limit and page should be a number"))

    console.log(city)

    if (typeof city === "string" && city.trim() !== "") {
        const cityReg = new RegExp(city, "i")

        const arr = [
            {
                $lookup: {
                    from: "productactives",
                    let: { productId: "$_id", cityName: city }, // or your dynamic city
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$productId", "$$productId"] },
                                        { $eq: ["$city", "$$cityName"] },
                                        { $eq: ["$isAvailable", true] } // Only include available ones
                                    ]
                                }
                            }
                        }
                    ],
                    as: "productAvailble"
                }
            },
            {
                $match: {
                    productAvailble: { $ne: [] } // Only include products that have at least one available productActive
                }
            }
        ]

        aggregationArray = [...arr, ...aggregationArray]
    }

    if (category !== undefined && category?.length > 0) {
        const obj = {
            $match: { category: new mongoose.Types.ObjectId(category), isActive: true }
        }

        aggregationArray.push(obj)
    }

    if (subcatagory !== undefined && subcatagory?.length > 0) {
        const obj = {
            $match: { subcategory: subcatagory, isActive: true }
        }

        aggregationArray.push(obj)
    }

    if (search !== undefined && search?.length > 0) {
        const searchWordArray = search?.split(" ")
        let searchReg = []

        searchWordArray?.map((word) => {
            const wordReg = new RegExp(word, "i")
            searchReg.push(wordReg)
        })

        const obj = {
            $match: {
                isActive: true,
                $or: [
                    { title: { $in: searchReg } },
                    { subTitle: { $in: searchReg } },
                ]
            }
        }

        aggregationArray.push(obj)
    }

    if (keyward !== undefined && keyward?.length > 0) {
        const obj = {
            '$match': {
                'isActive': true,
                keyward: new mongoose.Types.ObjectId(keyward)
            }
        }


        aggregationArray.push(obj)
    }

    if (typeof foodType === "string" && foodType.trim() !== "") {
        const obj = {
            $match: {
                foodType: foodType
            }
        }

        aggregationArray.push(obj)
    }

    if (
        (!isNaN(Number(priceFrom)) && Number(priceFrom) > 0) &&
        (!isNaN(Number(priceTo)) && Number(priceTo) > 0)
    ) {
        const obj = {
            $match: {
                "variant.sellingPrice": {
                    $lt: Number(priceFrom),
                    $gt: Number(priceTo)
                }
            }
        }

        aggregationArray.push(obj)
    }

    const arr = [
        {
            $match: {
                isActive: true,
                typeOfStore: typeOfStore
            }
        },
        {
            '$lookup': {
                'from': 'catagories',
                'localField': 'category',
                'foreignField': '_id',
                'as': 'categoryDetails'
            }
        }, {
            '$addFields': {
                'categoryName': {
                    '$first': '$categoryDetails.name'
                },
                'categoryActive': {
                    '$first': '$categoryDetails.isActive'
                },
                categoryDetails: {
                    $first: "$categoryDetails"
                }
            }
        },
        {
            $sort: {
                productSLNumber: -1
            }
        }
    ]

    aggregationArray = [...aggregationArray, ...arr]

    // console.log(aggregationArray)

    const data = await Product.aggregate(aggregationArray)
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(200).json(ApiResponse(200, "Products has been fetched", data))
    }

    try {
        const { newData, totalPages } = pagination(page, Number(limit), data)
        totalPage = totalPages
        splittedData = newData
    } catch (error) {
        console.log(error)
        return res.status(500).json(ApiError(500, "Something went wrong"))
    }

    const finalData = {
        totalPages: totalPage,
        data: splittedData,
        currentPage: Number(page)
    }

    return res.status(200).json(ApiResponse(200, "Products fetched", finalData))
})

const getProductsAdmin = asynchandler(async (req, res) => {
    const { subcatagory, search, keyward, category, staffBased, priceFrom, priceTo } = req.query
    const { page, limit, typeOfStore } = req.params
    let splittedData, totalPage
    let aggregationArray = []

    const staffId = req?.user?._id
    const city = req?.user?.city

    if (isNaN(Number(limit))) return res.status(400).json(ApiError(400, "Limit should be a number"))

    if (search !== undefined && search?.length > 0) {
        const searchReg = new RegExp(search, "i")
        const obj = {
            $match: {
                $or: [
                    { title: searchReg },
                    { categoryName: searchReg }
                ]
            }
        }

        aggregationArray.push(obj)
    }

    if (category !== undefined && category?.length > 0) {
        const obj = {
            $match: { category: new mongoose.Types.ObjectId(category), isActive: true }
        }

        aggregationArray.push(obj)
    }

    if (staffBased !== undefined && staffBased === "true") {
        const arr = [
            {
                $lookup: {
                    from: "productactives",
                    let: { currentProductId: "$_id" }, // pass product's _id
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$productId", "$$currentProductId"] }, // match productId to _id
                                        { $eq: ["$city", city] },
                                        { $eq: ["$staffId", new mongoose.Types.ObjectId(staffId)] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "cityAvailable"
                }
            },
            {
                $addFields: {
                    cityAvailable: { $first: "$cityAvailable" }
                }
            }
        ];

        aggregationArray = [...arr, ...aggregationArray]
    }

    const arr = [
        {
            $match: {
                typeOfStore: typeOfStore
            }
        },
        {
            '$lookup': {
                'from': 'catagories',
                'localField': 'category',
                'foreignField': '_id',
                'as': 'categoryDetails'
            }
        }, {
            '$addFields': {
                'categoryName': {
                    '$first': '$categoryDetails.name'
                },
                'categoryActive': {
                    '$first': '$categoryDetails.isActive'
                },
                categoryDetails: {
                    $first: "$categoryDetails"
                }
            }
        },
        {
            $sort: {
                productSLNumber: -1
            }
        }
    ]

    aggregationArray = [...arr, ...aggregationArray]

    const data = await Product.aggregate(aggregationArray)
    if (!Array.isArray(data) || data.length === 0) {
        return res.status(200).json(ApiResponse("Products has been fetched", data))
    }

    try {
        const { newData, totalPages } = pagination(page, Number(limit), data)
        totalPage = totalPages
        splittedData = newData
    } catch (error) {
        console.log(error)
        return res.status(500).json(ApiError(500, "Something went wrong"))
    }

    const finalData = {
        totalPages: totalPage,
        data: splittedData
    }

    return res.status(200).json(ApiResponse(200, "Products fetched", finalData))
})

const getSingleProduct = asynchandler(async (req, res) => {
    const { productId } = req.params

    let product = await Product.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(productId)
            }
        },
        {
            $lookup: {
                from: "catagories",
                localField: "category",
                foreignField: "_id",
                as: "category"
            }
        },
        {
            $lookup: {
                from: "keywards",
                localField: "keyward",
                foreignField: "_id",
                as: "keyward"
            }
        },
        {
            $addFields: {
                category: {
                    $first: "$category"
                }
            }
        }
    ])

    if (!Array.isArray || product?.length === 0) return res.status(404).json(ApiError(404, "Product not found"))

    product = product[0]

    return res.status(200).json(ApiResponse(200, "Product fetched", product))
})

const getReviews = asynchandler(async (req, res) => {
    const { productId, page } = req.params
    let data
    let totalPage

    const reviews = await Review.find({ product: productId }).sort({ _id: -1 })
    if (reviews?.length === 0) return res.status(200).json(ApiResponse(200, "Reviews fetched", []))

    try {
        const { newData, totalPages } = pagination(page, 10, reviews)
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

    return res.status(200).json(ApiResponse(200, "Reviews fetched", finalData))

})

// search api
const searchProducts = asynchandler(async (req, res) => {
    const { typeOfStore } = req.params
    const { search } = req.query
    let matchAggregationObj = {}

    if (typeof search === "string" && search?.trim() !== "") {
        const searchReg = new RegExp(search, "i")

        const obj = {
            $or: [
                { title: searchReg },
                { subTitle: searchReg },
            ]
        }

        matchAggregationObj = {
            ...obj
        }
    }

    const data = await Product.aggregate([
        {
            $match: {
                typeOfStore: typeOfStore,
                isActive: true,
                ...matchAggregationObj
            }
        },
        {
            $project: {
                title: 1,
                images: 1,
                _id: 1
            }
        },
        {
            $limit: 20
        }
    ])

    console.log(data)

    return res.status(200).json(ApiResponse(200, "Product fetched", data))
})

export {
    addProduct,
    updateProduct,
    deleteProduct,
    addImage,
    deleteImage,
    addVariant,
    updateVariant,
    deleteVariant,
    addCatagory,
    updateCatagory,
    deleteCatagory,
    addReview,
    deleteReview,
    getCatagories,
    getAllCatagories,
    getProducts,
    getReviews,
    getSingleProduct,
    addVideo,
    deleteVideo,
    getAllVideos,
    getVideoByProduct,
    editVideo,
    addSection,
    updateSection,
    deleteSection,
    addSubcategory,
    updateSubcategory,
    deleteSubcategory,
    getAllSection,
    getAllSubcategories,
    getProductsAdmin,
    addAddOnProduct,
    editAddOnProduct,
    deleteAddOnProduct,
    searchProducts
}