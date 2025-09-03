import { Company } from "../models/company.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";

const updateCompanyData = asynchandler(async(req,res) => {
    const fields = req.body
    const typeOfStore = req?.user?.typeOfStore
    let updateData = {}
    let logo 

    Object.keys(fields).forEach(key => {
        if(fields[key] !== "") {
            updateData[key] = fields[key]
        }
    })

    console.log(req?.file)

    if (req?.file) {
        const {filename} = req?.file
        updateData["logo"] = filename
    }

    const updatedCompany = await Company.findOneAndUpdate({
        typeOfStore: req?.user?.typeOfStore
    }, {
        $set: {
            ...updateData
        }
    })

    if (!updatedCompany) {
        const newCompany = await Company.create({
            typeOfStore: req?.user?.typeOfStore,
            ...updateData
        })

        return res.status(200).json(ApiResponse("Company has been created"))
    }
    
    return res.status(200).json(ApiResponse(200, "Company data updated successfully"))
})

const getCompanyData = asynchandler(async(req,res) => {
    const {typeOfStore} = req.params
    const company = await Company.findOne({typeOfStore: typeOfStore})

    return res.status(200).json(ApiResponse(200, "Company data fetched", company))
})

export {
    updateCompanyData,
    getCompanyData
}