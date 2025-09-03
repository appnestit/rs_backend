import mongoose, { Schema } from "mongoose";

const productSchema = new Schema({
    title: String,
    subTitle: String,
    totalReview: {
        type: Number,
        default: 0
    },
    description: String,
    totalSold: {
        type: Number,
        default: 0
    },
    images: [String],
    variant: [
        {
            value: String,
            unit: String, // not in use
            variantId: String,
            mrp: Number,
            discount: Number,
            sellingPrice: Number,
            specialPrice: Number,
            isSpecialPriceActive: Boolean,
            isActive: Boolean
        }
    ],
    addOnProducts: [{
        addOnId: String,
        title: String,
        price: Number,
        isEnable: {
            type: Boolean,
            default: true
        },
        foodType: {
            type: String,
            enum: ["Non", "Veg", "Egg", "Eggless", "Other"],
            default: "Non"
        },
    }],
    productSLNumber: Number,
    keyward: [{
        type: Schema.Types.ObjectId,
        ref: "Keyward"
    }],
    avgRating: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    mktDate: String,
    mktBy: String,
    expDate: String,
    origin: String,
    subcategory: {
        type: Schema.Types.ObjectId,
        ref: "Subcategory"
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Catagory"
    },
    section: {
        type: Schema.Types.ObjectId,
        ref: "Section"
    },
    loyaltyPoint: {
        type: Number,
        default: 0
    },
    foodType: {
        type: String,
        enum: ["Non", "Veg", "Egg", "Eggless", "Other"],
        default: "Non"
    },
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
})

const sectionSchema = new Schema({
    name: String,
    totalCatagory: {
        type: Number,
        default: 0
    },
    foodType: {
        type: String,
        enum: ["Non", "Veg", "Egg", "Eggless", "Other"],
        default: "Non"
    },
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
})

const catagorySchema = new Schema({
    name: String,
    image: String,
    catagorySLNumber: Number,
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: "Section"
    },
    totalSubcategory: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    foodType: {
        type: String,
        enum: ["Non", "Veg", "Egg", "Eggless", "Other"],
        default: "Non"
    },
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
})

const subCategorySchema = new Schema({
    name: String,
    catagoryId: {
        type: Schema.Types.ObjectId,
        ref: "Catagory"
    },
    subCatagorySLNumber: Number,
    image: String,
    isActive: {
        type: Boolean,
        default: true
    },
    foodType: {
        type: String,
        enum: ["Non", "Veg", "Egg", "Eggless", "Other"],
        default: "Non"
    },
})

const reviewSchema = new Schema({
    rating: Number,
    comment: String,
    date: String,
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    userImg: String,
    username: String
})

const videoReviewSchema = new Schema({
    url: String,
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    fullName: String,
    about: String
})

const Product = mongoose.model("Product", productSchema)
const Review = mongoose.model("Review", reviewSchema)
const VideoReview = mongoose.model("VideoReview", videoReviewSchema)
const Section = mongoose.model("Section", sectionSchema)
const Catagory = mongoose.model("Catagory", catagorySchema)
const Subcategory = mongoose.model("Subcategory", subCategorySchema)

export {
    Product,
    Catagory,
    Review,
    VideoReview,
    Section,
    Subcategory
}