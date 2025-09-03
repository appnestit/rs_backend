import mongoose, {Schema} from "mongoose";

const cartSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    productQuantity: String,
    discount: Number,
    totalPrice: Number,
    quantity: {
        type: Number,
        default: 1
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    productTitle: String,
    productImage: String,
    productVariant: Object,
    productCatagory: String,
    totalPoint: Number,
    variantId: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    cartType: {
        type: String,
        enum: ["Product", "AddOn"]
    }
})

export const Cart = mongoose.model("Cart", cartSchema)