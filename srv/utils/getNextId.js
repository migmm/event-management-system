/*
 * Function that gets the actual ID and returns the next ID for a table.
 *
 * @param {string} tableName - The name of the table for which the next ID is to be retrieved.
 * @param {string} [idField='ID'] - The name of the ID field in the table (default is 'ID').
 * @returns {Promise<number>} - A promise that resolves to the next available ID for the given table.
 *
 * @example
 * Example usage for the 'Events' table
 * const nextEventId = await getNextId('Events');
 *
 * @example
 * Example usage for a custom table with a custom ID field
 * const nextParticipantId = await getNextId('Participants', 'participantID');
 */
async function getNextId(tableName, idField = 'ID') {
    const result = await SELECT.from(tableName).orderBy({ [idField]: 'desc' }).limit(1);
    return result.length > 0 ? result[0][idField] + 1 : 1;
}
module.exports = {
    getNextId
};
