/**
 * Returns a standardized success message object.
 * @param {number} code - The HTTP status code.
 * @param {string} message - The success message.
 * @returns {Object} - An object containing the success status, code, and message.
 */
function getSuccessMessage(code, message) {
    return {
        status: 'success',
        code: code,
        message: message
    };
}

module.exports = {
    getSuccessMessage
};
