import mongoose, {Schema} from "mongoose";

const keywardSchema = new Schema({
    name: String,
    isActive: {
        type: Boolean,
        default: true
    },
    desc: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    },
    foodType: {
        type: String,
        enum: ["Non", "Veg"],
        default: "Non"
    },
})

export const Keyward = mongoose.model("Keyward", keywardSchema)