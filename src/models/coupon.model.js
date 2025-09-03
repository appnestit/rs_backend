import mongoose, { Schema } from "mongoose";

const couponSchema = new Schema({
    coupon: String,
    discount: Number,
    discountType: {
        type: String,
        enum: ['Percentage', 'Rupees']
    },
    minimumAmount: Number,
    isPublic: Boolean,
    isActive: {
        type: Boolean,
        default: true
    },
    days: Number,
    expireAt: { type: Date, expires: 0 },
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
})

export const Coupon = mongoose.model("Coupon", couponSchema)