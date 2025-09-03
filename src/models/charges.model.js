import mongoose, {Schema} from "mongoose";

const chargesSchema = new Schema({
    chargeAmount: Number,
    minimumAmount: Number,
    title: String,
    isEnable: {
        type: Boolean,
        default: true
    },
    chargeType: {
        type: String,
        enum: ['Percentage', 'Rupees']
    },
    maximumAmount: Number,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    }
})

export const Charges = mongoose.model("Charges", chargesSchema)