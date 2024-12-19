/**
 * Returns a standardized error message object.
 * @param {number} code - The HTTP status code.
 * @param {string} message - The error message.
 * @returns {Object} - An object containing the error status, code, and message.
 */
function getErrorMessage(code, message) {
    return {
        status: 'error',
        code: code,
        message: message
    };
}

module.exports = {
    getErrorMessage
};