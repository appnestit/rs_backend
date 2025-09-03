export const ClassResponse = (isSuccess, statusCode, message, data) => {
    return {
        isSuccess,
        statusCode,
        message,
        data
    }
}