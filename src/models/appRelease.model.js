import mongoose, {Schema} from "mongoose";

const appReleaseSchema = new Schema({
    buildNumber: Number,
    versionName: String,
    date: String,
    description: String
})

export const AppRelease = mongoose.model("AppRelease", appReleaseSchema)