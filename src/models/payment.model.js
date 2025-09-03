import mongoose, { Schema } from "mongoose"

const paymentSchema = new Schema({
    products: [Object],
    order_id: String,
    totalPrice: Number,
    coupon: String,
    discount: Number,
    paymentStatus: {
        type: String,
        enum: ["Due", "Completed"]
    },
    paymentMethod: {
        type: String,
        enum: ["Online", "COD", "Pickup"]
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    address: Object,
    razorpayPaymentId: String,
    razorpayOrderId: String,
    razorpaySignature: String,
    delivaryStatus: {
        type: String,
        enum: ['Confirmed', 'Prepeared', 'Dispatched', 'Out for Delivary', 'Delivered', 'Canceled']
    },
    date: {
        type: Date,
    },
    dateAndTime: {
        type: Date
    },
    charges: [Object],
    chargeAmount: Number,
    discountType: String,
    invoice: String,
    invoiceId: String,
    orderNumber: String,
    serialNo: Number,
    deliveryTime: String,
    totalPoints: {
        type: Number,
        default: 0
    },
    isReferredOrder: {
        type: Boolean,
        default: false
    },
    referCode: String,
    referUserId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    referDiscount: {
        type: Number,
        default: 0
    },
    city: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    specialMessage: String
})

export const Payment = mongoose.model("Payment", paymentSchema)