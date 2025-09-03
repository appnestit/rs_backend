import mongoose, {Schema} from "mongoose";

const companySchema = new Schema({
    companyName: String,
    gstNo: String,
    address: String,
    email: String,
    contact: String,
    website: String,
    logo: String,
    fssaiNo: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    totalCustomer: {
        type: Number,
        default: 0
    },
    totalStaff: {
        type: Number,
        default: 0
    },
    totalProduct: {
        type: Number,
        default: 0
    },
    totalCatagories: {
        type: Number,
        default: 0
    },
    totalInvoice: {
        type: Number,
        default: 0
    },
    totalOrder: {
        type: Number,
        default: 0
    },
    pointValueInMoney: {
        type: Number,
        default: 50
    },
    pointPerRefer: {
        type: Number,
        default: 5
    },
    discountPerRefer: {
        type: Number,
        default: 15
    }
})

export const Company = mongoose.model("Company", companySchema)