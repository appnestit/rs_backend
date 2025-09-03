import mongoose, {Schema} from "mongoose";

const productActiveSchema = new Schema({
    staffId: {
        type: Schema.Types.ObjectId,
        ref: "Staff"
    },
    city: String,
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product"
    },
    isAvailable: {
        type: Boolean,
        default: true
    }
})

export const ProductActive = mongoose.model("ProductActive", productActiveSchema)