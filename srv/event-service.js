const cds = require('@sap/cds');
const { getNextId } = require('./utils/getNextId');

module.exports = cds.service.impl(async function () {
    const {
        Events,
        Participants,
        BusinessPartners
    } = this.entities;

    const bpService = await cds.connect.to('API_BUSINESS_PARTNER');


    console.log('Destination details:', bpService.options)
    this.on('READ', 'BusinessPartners', async (req) => {
        try {
            return await bpService.run(req.query);
        } catch (error) {
            console.error('Error fetching Business Partners:', error);
            throw error;
        }
    });


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

    this.after('CREATE', 'Participants', async (data, req) => {

        const createdParticipant = await SELECT.one.from(Participants).where({ ID: req.data.ID });

        console.log('Retrieved created participant:', createdParticipant);

        if (createdParticipant) {
            return createdParticipant;
        } else {
            req.reject(500, 'Failed to retrieve the created participant.');
        }
    });


    /*
     * Custom logic to get a new ID before creating a record in the Events or Participants table.
     * The function `getNextId` is called to determine the next available ID for the respective table.
     */

    this.before('CREATE', 'Events', async (req) => {
        const tableName = req.target.name;
        const newID = await getNextId(tableName); // Get the next available ID for the Events table
        req.data.ID = newID;
    });

    this.before('CREATE', 'Participants', async (req) => {
        const tableName = req.target.name;
        const newID = await getNextId(tableName); // Get the next available ID for the Participants table
        req.data.ID = newID;
    });

    
    this.before('UPDATE', 'Participants', async (req) => {
        const { ID, BusinessPartnerID } = req.data;

        const originalParticipant = await SELECT.one.from(Participants).where({ ID });

        if (!originalParticipant) {
            req.reject(404, `Participant with ID ${ID} not found.`);
        }

        if (originalParticipant.BusinessPartnerID !== BusinessPartnerID) {
            req.reject(400, 'BusinessPartnerID cannot be changed once set.');
        }
    });


    /*
    * registerParticipant:
    * This action registers a participant for an event. It checks if the event is active
    * and not cancelled. It also verifies that the participant exists and has a valid
    * BusinessPartnerID. If any validation fails, it returns false.
    */
    this.on('registerParticipant', async (req) => {
        const { eventID, participantID } = req.data;
    
        // Validate event exists, is active, and is not cancelled
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);
    
        // Check if the event exists and is active
        if (event.length === 0 || event[0].IsCancelled || !event[0].IsActive) {
            console.log(`Event with ID ${eventID} not found, cancelled, or inactive.`);
            return {
                status: 'error',
                code: 404,
                message: `Event with ID ${eventID} not found, is cancelled, or inactive.`
            };
        }
    
        // Log the event data for debugging purposes
        console.log('Event found:', event[0]);
    
        // Validate the participant exists and has a valid BusinessPartnerID
        const participant = await SELECT.from(Participants).where({ ID: participantID }).limit(1);
    
        // Check if the participant exists and has a valid BusinessPartnerID
        if (participant.length === 0 || !participant[0].BusinessPartnerID) {
            console.log(`Participant with ID ${participantID} not found or missing BusinessPartnerID.`);
            return {
                status: 'error',
                code: 404,
                message: `Participant with ID ${participantID} not found or missing BusinessPartnerID.`
            };
        }
    
        // Log the participant data for debugging purposes
        console.log('Participant found:', participant[0]);
    
        // Check if the participant is already registered for the event
        const existingRegistration = await SELECT.from(Participants)
            .where({ ID: participantID, Event: { ID: eventID } })
            .limit(1);
    
        // If the participant is already registered for the event, return an error
        if (existingRegistration.length > 0) {
            console.log(`Participant with ID ${participantID} is already registered for event with ID ${eventID}.`);
            return {
                status: 'error',
                code: 400,
                message: `Participant with ID ${participantID} is already registered for event with ID ${eventID}.`
            };
        }
    
        // Register the participant for the event by updating the participant's Event association
        const result = await UPDATE(Participants)
            .set({ Event: { ID: eventID } }) // Correctly associating the participant with the event
            .where({ ID: participantID });
    
        // Verify if the participant registration was successful
        if (result === 0) {
            console.log(`Failed to register participant with ID ${participantID} for event with ID ${eventID}.`);
            return {
                status: 'error',
                code: 500,
                message: `Failed to register participant with ID ${participantID} for event with ID ${eventID}.`
            };
        }
    
        console.log(`Participant with ID ${participantID} has been successfully registered for event with ID ${eventID}.`);
        return {
            status: 'success',
            code: 200,
            message: `Participant with ID ${participantID} has been successfully registered for event with ID ${eventID}.`
        };
    });
    
    

    this.on('fetchParticipantDetails', async (req) => {
        const { ParticipantID } = req.data;

        if (!ParticipantID) {
            req.reject(400, "ParticipantID is required");
        }

        try {
            // Fetch the participant data
            const participant = await SELECT.one.from(Participants).where({ ID: ParticipantID });
            if (!participant) {
                req.reject(404, `Participant with ID ${ParticipantID} not found`);
            }

            let businessPartnerData = null;

            // Fetch Business Partner data if BusinessPartnerID exists
            if (participant.BusinessPartnerID) {
                try {
                    businessPartnerData = await bpService.run(
                        SELECT.one.from(BusinessPartners).where({ BusinessPartner: participant.BusinessPartnerID })
                    );
                } catch (error) {
                    console.error(`Error fetching Business Partner data:`, error);
                }
            }

            // Customize the return structure:
            // Merge BusinessPartnerData into BusinessPartnerID and remove the association
            const result = {
                ...participant,
                BusinessPartnerID: businessPartnerData || null
            };
            delete result.BusinessPartner; // Remove the association

            return result;

        } catch (error) {
            console.error("Error in fetchParticipantDetails:", error);
            req.reject(500, "An unexpected error occurred");
        }
    });


    /**
  * getEventParticipants:
  * This action retrieves participants for a specific event. It checks if the event exists,
  * is active, and is not cancelled. If the event is valid, it returns the participants.
  * Otherwise, it returns an empty array.
  */
    this.on('getEventParticipants', async (req) => {
        const { eventID } = req.data;

        // Query the event from the database
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        // Check if the event exists, is active, and is not cancelled
        if (event.length === 0 || event[0].IsCancelled || !event[0].IsActive) {
            console.log(`Event with ID ${eventID} not found, cancelled, or inactive.`);
            return []; // Return an empty array if the event is invalid
        }

        // Log the event details for debugging purposes
        console.log('Event found:', event[0]);

        // Retrieve the participants associated with the event
        // Make sure to use 'Event_ID' (without space) instead of 'Event ID'
        const participants = await SELECT.from(Participants).where({ Event_ID: eventID });

        // Log the participants details for debugging purposes
        console.log(`Found ${participants.length} participants for event with ID ${eventID}.`);

        // Return the list of participants
        return participants;
    });


    /*
     * cancelEvent:
     * This action cancels an event by marking it as cancelled (IsCancelled = true),
     * deactivating it (IsActive = false), and storing the reason for cancellation
     * (CancellationReason). If the event doesn't exist, it returns false. 
     */
    this.on('cancelEvent', async (req) => {
        const { eventID, reason } = req.data;

        // Limit the results to 1 and fetch the event
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        // Check if the event does not exist
        if (event.length === 0) {
            console.log(`Event with ID ${eventID} not found.`);
            return false;
        }

        // Log the event data for debugging purposes
        console.log('Event found:', event[0]);

        // Perform the update to cancel the event
        const result = await UPDATE(Events)
            .set({
                IsCancelled: true,
                IsActive: false,
                CancellationReason: reason
            })
            .where({ ID: eventID });

        // Check if the update was successful (no rows updated)
        if (result === 0) {
            console.log(`Failed to update event with ID ${eventID}.`);
            return false;
        }

        console.log(`Event with ID ${eventID} has been cancelled.`);
        return true;
    });


    /*
     * reopenEvent:
     * This action reopens a previously cancelled event by setting IsCancelled to false,
     * IsActive to true, and clearing the CancellationReason. If the event doesn't exist 
     * or isn't cancelled, it returns false.
     */
    this.on('reopenEvent', async (req) => {
        const { eventID } = req.data;

        // Limit the results to 1 and fetch the event
        const event = await SELECT.from(Events).where({ ID: eventID }).limit(1);

        // Check if the event doesn't exist or isn't cancelled
        if (event.length === 0 || !event[0].IsCancelled) {
            console.log(`Event with ID ${eventID} not found or not cancelled.`);
            return false;
        }

        // Log the event data for debugging purposes
        console.log('Event found:', event[0]);

        // Perform the update to reopen the event
        const result = await UPDATE(Events)
            .set({
                IsCancelled: false,
                IsActive: true,
                CancellationReason: null
            })
            .where({ ID: eventID });

        // Check if the update was successful (no rows updated)
        if (result === 0) {
            console.log(`Failed to reopen event with ID ${eventID}.`);
            return false;
        }

        console.log(`Event with ID ${eventID} has been reopened.`);
        return true;
    });
});