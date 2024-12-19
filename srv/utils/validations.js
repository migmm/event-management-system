module.exports = {
    validateParticipantFields,
    validateEventDates,
    validateEmailAndPhone,
    validateBusinessPartnerID,
    validateEventStatus,
    validateEventExists,
    validateParticipantExists,
    validateEventCancellation,
    validateEventReopening
};

/**
 * Validates the required fields for a participant.
 * @param {Object} req - The request object.
 * @param {Object} data - The participant data.
 */
function validateParticipantFields(req, data) {
    const { BusinessPartnerID, FirstName, LastName, Email, Phone } = data;

    if (!BusinessPartnerID) req.reject(400, 'BusinessPartnerID is required.');
    if (!FirstName || !LastName || !Email || !Phone) {
        req.reject(400, 'FirstName, LastName, Email, and Phone are required.');
    }
}

/**
 * Validates that the StartDate is not after the EndDate.
 * @param {Object} req - The request object.
 * @param {Date} StartDate - The start date.
 * @param {Date} EndDate - The end date.
 */
function validateEventDates(req, StartDate, EndDate) {
    if (StartDate > EndDate) {
        req.error(400, 'StartDate cannot be after EndDate');
    }
}

/**
 * Validates email and phone number format.
 * @param {Object} req - The request object.
 * @param {string} email - The email address.
 * @param {string} phone - The phone number.
 */
function validateEmailAndPhone(req, email, phone) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^\+?[0-9]*$/;

    if (email && !emailRegex.test(email)) {
        req.error(400, 'Invalid email format');
    }

    if (phone && !phoneRegex.test(phone)) {
        req.error(400, 'Invalid phone number format');
    }
}

/**
 * Validates that the BusinessPartnerID cannot be changed.
 * @param {Object} req - The request object.
 * @param {string} originalBusinessPartnerID - The original BusinessPartnerID.
 * @param {string} newBusinessPartnerID - The new BusinessPartnerID.
 */
function validateBusinessPartnerID(req, originalBusinessPartnerID, newBusinessPartnerID) {
    if (originalBusinessPartnerID !== newBusinessPartnerID) {
        req.reject(400, 'BusinessPartnerID cannot be changed once set.');
    }
}

/**
 * Validates the event status (active and not cancelled).
 * @param {Object} req - The request object.
 * @param {Object} event - The event object.
 */
function validateEventStatus(req, event) {
    if (event.length === 0 || event[0].IsCancelled || !event[0].IsActive) {
        console.log(`Event with ID ${event[0].ID} not found, cancelled, or inactive.`);
        return false;
    }
    return true;
}

/**
 * Validates that the event exists.
 * @param {Object} req - The request object.
 * @param {Object} event - The event object.
 */
function validateEventExists(req, event) {
    if (event.length === 0) {
        console.log(`Event with ID ${event[0].ID} not found.`);
        return false;
    }
    return true;
}

/**
 * Validates that the participant exists.
 * @param {Object} req - The request object.
 * @param {Object} participant - The participant object.
 */
function validateParticipantExists(req, participant) {
    if (participant.length === 0 || !participant[0].BusinessPartnerID) {
        console.log(`Participant with ID ${participant[0].ID} not found or missing BusinessPartnerID.`);
        return false;
    }
    return true;
}

/**
 * Validates the event cancellation.
 * @param {Object} req - The request object.
 * @param {Object} event - The event object.
 * @param {string} reason - The cancellation reason.
 */
function validateEventCancellation(req, event, reason) {
    if (event.length === 0) {
        console.log(`Event with ID ${event[0].ID} not found.`);
        return {
            status: 'error',
            code: 404,
            message: `Event with ID ${event[0].ID} not found.`
        };
    }

    if (!reason) {
        return {
            status: 'error',
            code: 400,
            message: 'Cancellation reason is required.'
        };
    }

    return {
        status: 'success',
        code: 200,
        message: `Event with ID ${event[0].ID} has been cancelled.`
    };
}

/**
 * Validates the event reopening.
 * @param {Object} req - The request object.
 * @param {Object} event - The event object.
 */
function validateEventReopening(req, event) {
    if (event.length === 0 || !event[0].IsCancelled) {
        console.log(`Event with ID ${event[0].ID} not found or not cancelled.`);
        return {
            status: 'error',
            code: 404,
            message: `Event with ID ${event[0].ID} not found or not cancelled.`
        };
    }

    return {
        status: 'success',
        code: 200,
        message: `Event with ID ${event[0].ID} has been reopened.`
    };
}