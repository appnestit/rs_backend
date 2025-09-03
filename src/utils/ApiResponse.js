export const ApiResponse = (
    statusCode,
    message,
    data
) => {
    return {
        status: "Success",
        statusCode: statusCode,
        message: message,
        data: data
    }
}