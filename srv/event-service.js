const cds = require('@sap/cds');
const { getNextId } = require('./utils/getNextId');
const {
    validateParticipantFields,
    validateEventDates,
    validateEmailAndPhone,
    validateBusinessPartnerID,
    validateEventStatus,
    validateEventExists,
    validateParticipantExists,
    validateEventCancellation,
    validateEventReopening
} = require('./utils/validations');
const { getErrorMessage } = require('./utils/errorMessages');
const { getSuccessMessage } = require('./utils/sucessMessages');

module.exports = cds.service.impl(async function () {
    const {
        Events,  // Event entity
        Participants,  // Participant entity
    } = this.entities;

    const bpService = await cds.connect.to('API_BUSINESS_PARTNER');
    console.log('Destination details:', bpService.options);

    /** 
     * Event handler for 'READ' requests on the 'BusinessPartners' entity.
     * Fetches Business Partners from the connected external API.
     */
    this.on('READ', 'BusinessPartners', async (req) => {
        try {
            return await bpService.run(req.query);
        } catch (error) {
            console.error('Error fetching Business Partners:', error);
            throw error;
        }
    });

    /** 
     * Event handler before 'CREATE' on 'Participants' entity.
     * Ensures necessary fields are provided and validates Business Partner existence.
     */
    this.before('CREATE', 'Participants', async (req) => {
        const { BusinessPartnerID, FirstName, LastName, Email, Phone } = req.data;
        const tableName = req.target.name;
        const newID = await getNextId(tableName);
        req.data.ID = newID;

        validateParticipantFields(req, req.data);

        const bpExists = await bpService.run(
            SELECT.one.from('API_BUSINESS_PARTNER.A_BusinessPartner')
                .where({ BusinessPartner: BusinessPartnerID })
        );
        if (!bpExists) req.reject(404, `Business Partner with ID ${BusinessPartnerID} does not exist.`);

        const email = req.data.Email;
        const phone = req.data.Phone;

        validateEmailAndPhone(req, email, phone);

        const existingParticipant = await SELECT.one.from(Participants).where({ Email: email });

        if (existingParticipant) {
            req.error(400, 'Email already exists');
        }
    });

    /** 
     * Event handler before 'CREATE' on the 'Events' entity.
     * Ensures that the event's StartDate is not after EndDate.
     */
    this.before('CREATE', 'Events', async (req) => {
        const tableName = req.target.name;
        const newID = await getNextId(tableName);
        req.data.ID = newID;
        const { StartDate, EndDate } = req.data;

        validateEventDates(req, StartDate, EndDate);
    });

    /** 
     * Event handler before 'UPDATE' on 'Participants' entity.
     * Ensures that BusinessPartnerID cannot be changed, and validates email and phone format.
     */
    this.before('UPDATE', 'Participants', async (req) => {
        const { ID, BusinessPartnerID } = req.data;

        const originalParticipant = await SELECT.one.from(Participants).where({ ID });

        if (!originalParticipant) {
            req.reject(404, `Participant with ID ${ID} not found.`);
        }

        validateBusinessPartnerID(req, originalParticipant.BusinessPartnerID, BusinessPartnerID);

        const email = req.data.Email;
        const phone = req.data.Phone;

        validateEmailAndPhone(req, email, phone);
    });

    /** 
     * Action to validate event and participant.
     * Verifies if the event is active or exist, and checks if the participant exists.
     */
  this.before('getEventParticipants', async (req) => {
        const { eventID } = req.data;
        const { participantID } =req.data;
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        validateEventExists(req, event) 

        validateParticipantExists(req, participantID)

        console.log('Event found:', event[0]);

        const participants = await SELECT.from(Participants).where({ Event_ID: eventID });

        console.log(`Found ${participants.length} participants for event with ID ${eventID}.`);

        return participants;
    });

    
    /** 
     * Action to register a participant for an event.
     * Verifies if the event is active, and checks if the participant exists.
     */
    this.on('registerParticipant', async (req) => {
        const { eventID, participantID } = req.data;

        // Validate event exists, is active, and is not cancelled
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        if (!validateEventStatus(req, event)) {
            return getErrorMessage(404, `Event with ID ${eventID} not found, cancelled, or inactive.`);
        }

        // Validate the participant exists and has a valid BusinessPartnerID
        const participant = await SELECT.from(Participants).where({ ID: participantID }).limit(1);

        if (!validateParticipantExists(req, participant)) {
            return getErrorMessage(404, `Participant with ID ${participantID} not found or missing BusinessPartnerID.`);
        }

        // Register the participant for the event by updating the participant's Event association
        const result = await UPDATE(Participants)
            .set({ Event: { ID: eventID } })
            .where({ ID: participantID });

        if (result === 0) {
            console.log(`Failed to register participant with ID ${participantID} for event with ID ${eventID}.`);
            return getErrorMessage(500, `Failed to register participant with ID ${participantID} for event with ID ${eventID}.`);
        }

        console.log(`Participant with ID ${participantID} has been successfully registered for event with ID ${eventID}.`);
        return getSuccessMessage(200, `Participant with ID ${participantID} has been successfully registered for event with ID ${eventID}.`);
    });

    /** 
     * Action to cancel an event.
     * Marks the event as cancelled and stores the reason for cancellation.
     */
    this.on('cancelEvent', async (req) => {
        const { eventID, reason } = req.data;

        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        const validationResult = validateEventCancellation(req, event, reason);
        if (validationResult.status === 'error') {
            return validationResult;
        }

        const result = await UPDATE(Events)
            .set({
                IsCancelled: true,
                IsActive: false,
                CancellationReason: reason
            })
            .where({ ID: eventID });

        if (result === 0) {
            console.log(`Failed to update event with ID ${eventID}.`);
            return getErrorMessage(500, `Failed to update event with ID ${eventID}.`);
        }

        console.log(`Event with ID ${eventID} has been cancelled.`);
        return getSuccessMessage(200, `Event with ID ${eventID} has been cancelled.`);
    });

    /** 
     * Action to reopen a cancelled event.
     * Reverts the event status to active and clears the cancellation reason.
     */
    this.on('reopenEvent', async (req) => {
        const { eventID } = req.data;

        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        const validationResult = validateEventReopening(req, event);
        if (validationResult.status === 'error') {
            return validationResult;
        }

        const result = await UPDATE(Events)
            .set({
                IsCancelled: false,
                IsActive: true,
                CancellationReason: null
            })
            .where({ ID: eventID });

        if (result === 0) {
            console.log(`Failed to reopen event with ID ${eventID}.`);
            return getErrorMessage(500, `Failed to reopen event with ID ${eventID}.`);
        }

        console.log(`Event with ID ${eventID} has been reopened.`);
        return getSuccessMessage(200, `Event with ID ${eventID} has been reopened.`);
    });

    /** 
     * Event handler before 'UPDATE' on 'Event' entity.
     * Validates that the event's StartDate is not after EndDate.
     */
    this.before('UPDATE', 'Event', async (req) => {
        const { StartDate, EndDate } = req.data;
        validateEventDates(req, StartDate, EndDate);
    });
});