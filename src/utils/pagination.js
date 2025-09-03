export const pagination = (page, limit, data) => {
    // validation
    if(isNaN(page) || isNaN(limit)) throw new Error("Page and limit should be in number data type")
    if(!Array.isArray(data)) throw new Error("Data should be an array")

    // some calculations
    let initialData = data
    let totalRecords = data?.length
    let totalPages = Math.ceil(totalRecords/Number(limit))

    if(page > totalPages) return null

    // split data
    let startIndex = (page - 1) * limit
    let endIndex = page * limit
    let newData = initialData?.slice(startIndex, endIndex)

    return {
        totalPages,
        newData
    }
}