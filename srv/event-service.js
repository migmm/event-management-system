module.exports = cds.service.impl(async function() {
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
});
