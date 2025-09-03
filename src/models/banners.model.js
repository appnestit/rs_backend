import mongoose, {Schema} from "mongoose";

const bannerSchema = new Schema({
    image: String,
    typeOfStore: {
        type: String,
        enum: ["Bakery", "Rest"]
    }
})

export const Banner = mongoose.model("Banner", bannerSchema)