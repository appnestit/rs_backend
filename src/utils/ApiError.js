export const ApiError = (
    statusCode,
    message,
    data
) => {
    return {
        status: "Error",
        statusCode: statusCode,
        message: message,
        data: data
    }
}