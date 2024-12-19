const cds = require('@sap/cds');
const { getNextId } = require('./utils/getNextId');

module.exports = cds.service.impl(async function () {
    const {
        Events,  // Event entity
        Participants,  // Participant entity
        BusinessPartners  // Business Partner entity
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

        if (!BusinessPartnerID) req.reject(400, 'BusinessPartnerID is required.');
        const bpExists = await bpService.run(
            SELECT.one.from('API_BUSINESS_PARTNER.A_BusinessPartner')
                .where({ BusinessPartner: BusinessPartnerID })
        );
        if (!bpExists) req.reject(404, `Business Partner with ID ${BusinessPartnerID} does not exist.`);

        if (!FirstName || !LastName || !Email || !Phone) {
            req.reject(400, 'FirstName, LastName, Email, and Phone are required.');
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
        if (StartDate > EndDate) {
            req.error(400, 'StartDate cannot be after EndDate');
        }
    });

    /** 
     * Event handler before 'CREATE' on the 'Participants' entity.
     * Validates email and phone number format, and checks for duplicate emails.
     */
    this.before('CREATE', 'Participants', async (req) => {
        const tableName = req.target.name;
        const newID = await getNextId(tableName);
        req.data.ID = newID;

        const email = req.data.Email;
        const phone = req.data.Phone;

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^\+?[0-9]*$/;

        if (email && !emailRegex.test(email)) {
            req.error(400, 'Invalid email format');
        }

        if (phone && !phoneRegex.test(phone)) {
            req.error(400, 'Invalid phone number format');
        }

        const existingParticipant = await SELECT.one.from(Participants).where({ Email: email });

        if (existingParticipant) {
            req.error(400, 'Email already exists');
        }
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

        if (originalParticipant.BusinessPartnerID !== BusinessPartnerID) {
            req.reject(400, 'BusinessPartnerID cannot be changed once set.');
        }

        const email = req.data.Email;
        const phone = req.data.Phone;

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const phoneRegex = /^\+?[0-9]*$/;

        if (email && !emailRegex.test(email)) {
            req.error(400, 'Invalid email format');
        }

        if (phone && !phoneRegex.test(phone)) {
            req.error(400, 'Invalid phone number format');
        }
    });

    /** 
     * Action to register a participant for an event.
     * Verifies if the event is active, and checks if the participant exists.
     */
    this.on('registerParticipant', async (req) => {
        const { eventID, participantID } = req.data;

        // Validate event exists, is active, and is not cancelled
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        // Check if the event exists and is active
        if (event.length === 0 || event[0].IsCancelled || !event[0].IsActive) {
            console.log(`Event with ID ${eventID} not found, cancelled, or inactive.`);
            return false;
        }

        // Log the event data for debugging purposes
        console.log('Event found:', event[0]);

        // Validate the participant exists and has a valid BusinessPartnerID
        const participant = await SELECT.from(Participants).where({ ID: participantID }).limit(1);

        // Check if the participant exists and has a valid BusinessPartnerID
        if (participant.length === 0 || !participant[0].BusinessPartnerID) {
            console.log(`Participant with ID ${participantID} not found or missing BusinessPartnerID.`);
            return false;
        }

        // Log the participant data for debugging purposes
        console.log('Participant found:', participant[0]);

        // Register the participant for the event by updating the participant's Event association
        // Note: Ensure the participant's Event ID is correctly updated
        const result = await UPDATE(Participants)
            .set({ Event: { ID: eventID } }) // Correctly associating the participant with the event
            .where({ ID: participantID });

        // Verify if the participant registration was successful
        if (result === 0) {
            console.log(`Failed to register participant with ID ${participantID} for event with ID ${eventID}.`);
            return false;
        }

        console.log(`Participant with ID ${participantID} has been successfully registered for event with ID ${eventID}.`);
        return true;
    });
    
    /** 
     * Action to fetch participant details.
     * Returns the participant's information along with Business Partner data if available.
     */
    this.on('fetchParticipantDetails', async (req) => {
        const { ParticipantID } = req.data;

        if (!ParticipantID) {
            req.reject(400, "ParticipantID is required");
        }

        try {
            const participant = await SELECT.one.from(Participants).where({ ID: ParticipantID });
            if (!participant) {
                req.reject(404, `Participant with ID ${ParticipantID} not found`);
            }

            let businessPartnerData = null;

            if (participant.BusinessPartnerID) {
                try {
                    businessPartnerData = await bpService.run(
                        SELECT.one.from(BusinessPartners).where({ BusinessPartner: participant.BusinessPartnerID })
                    );
                } catch (error) {
                    console.error(`Error fetching Business Partner data:`, error);
                }
            }

            const result = {
                ...participant,
                BusinessPartnerID: businessPartnerData || null
            };
            delete result.BusinessPartner;

            return result;

        } catch (error) {
            console.error("Error in fetchParticipantDetails:", error);
            req.reject(500, "An unexpected error occurred");
        }
    });

    /** 
     * Action to retrieve participants for a specific event.
     * Returns participants associated with the event if valid.
     */
    this.on('getEventParticipants', async (req) => {
        const { eventID } = req.data;

        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        if (event.length === 0 || event[0].IsCancelled || !event[0].IsActive) {
            console.log(`Event with ID ${eventID} not found, cancelled, or inactive.`);
            return [];
        }

        console.log('Event found:', event[0]);

        const participants = await SELECT.from(Participants).where({ Event_ID: eventID });

        console.log(`Found ${participants.length} participants for event with ID ${eventID}.`);

        return participants;
    });

    /** 
     * Action to cancel an event.
     * Marks the event as cancelled and stores the reason for cancellation.
     */
    this.on('cancelEvent', async (req) => {
        const { eventID, reason } = req.data;

        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        if (event.length === 0) {
            console.log(`Event with ID ${eventID} not found.`);
            return {
                status: 'error',
                code: 404,
                message: `Event with ID ${eventID} not found.`
            };
        }

        console.log('Event found:', event[0]);

        const result = await UPDATE(Events)
            .set({
                IsCancelled: true,
                IsActive: false,
                CancellationReason: reason
            })
            .where({ ID: eventID });

        if (result === 0) {
            console.log(`Failed to update event with ID ${eventID}.`);
            return {
                status: 'error',
                code: 500,
                message: `Failed to update event with ID ${eventID}.`
            };
        }

        console.log(`Event with ID ${eventID} has been cancelled.`);
        return {
            status: 'success',
            code: 200,
            message: `Event with ID ${eventID} has been cancelled.`
        };
    });

    /** 
     * Action to reopen a cancelled event.
     * Reverts the event status to active and clears the cancellation reason.
     */
    this.on('reopenEvent', async (req) => {
        const { eventID } = req.data;

        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        if (event.length === 0 || !event[0].IsCancelled) {
            console.log(`Event with ID ${eventID} not found or not cancelled.`);
            return {
                status: 'error',
                code: 404,
                message: `Event with ID ${eventID} not found or not cancelled.`
            };
        }

        console.log('Event found:', event[0]);

        const result = await UPDATE(Events)
            .set({
                IsCancelled: false,
                IsActive: true,
                CancellationReason: null
            })
            .where({ ID: eventID });

        if (result === 0) {
            console.log(`Failed to reopen event with ID ${eventID}.`);
            return {
                status: 'error',
                code: 500,
                message: `Failed to reopen event with ID ${eventID}.`
            };
        }

        console.log(`Event with ID ${eventID} has been reopened.`);
        return {
            status: 'success',
            code: 200,
            message: `Event with ID ${eventID} has been reopened.`
        };
    });

    /** 
     * Event handler before 'UPDATE' on 'Event' entity.
     * Validates that the event's StartDate is not after EndDate.
     */
    this.before('UPDATE', 'Event', async (req) => {
        const { StartDate, EndDate } = req.data;
        if (StartDate > EndDate) {
            req.error(400, 'StartDate cannot be after EndDate');
        }
    });
});
