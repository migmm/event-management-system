const cds = require('@sap/cds');
const { getNextId } = require('./utils/getNextId');

module.exports = cds.service.impl(async function () {
    const {
        Events,
        Participants,
        BusinessPartners
    } = this.entities;

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