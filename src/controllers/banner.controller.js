import { Banner } from "../models/banners.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const addBanner = asynchandler(async(req,res)=>{
    const typeOfStore = req?.user?.typeOfStore

    if(req?.file === undefined || !typeOfStore) return res.status(400).json(ApiError(400, "Image file and store type is required"))
    
    const {filename} = req?.file

    const newbanner = await Banner.create({
        image: filename,
        typeOfStore: typeOfStore
    })
    if(!newbanner) return res.status(500).json(ApiError(500, "Banner upload failed"))
    
    return res.status(200).json(ApiResponse(200, "Banner uploaded", newbanner))
})

const deleteBanner = asynchandler(async(req,res)=>{
    const {id} = req.params
    if(!id) return res.status(400).json(ApiError(400, "Id is required"))

    await Banner.findByIdAndDelete(id)

    return res.status(200).json(ApiResponse(200, "Deleted successfully"))
})

const getBanners = asynchandler(async(req, res)=>{
    const {typeOfStore} = req.query
    let aggregationObject = {}

    if (typeof typeOfStore === "string" && typeOfStore.trim() !== "") {
        aggregationObject = {
            typeOfStore: typeOfStore
        }
    }

    const banners = await Banner.find({...aggregationObject})

    return res.status(200).json(ApiResponse(200, "Banners fetched", banners))
})

export {
    addBanner,
    deleteBanner,
    getBanners
}