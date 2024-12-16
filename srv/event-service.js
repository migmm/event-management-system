


module.exports = cds.service.impl(async function() {
  const bpService = await cds.connect.to('API_BUSINESS_PARTNER');

  // Explicitly handle READ requests for BusinessPartners
  this.on('READ', 'BusinessPartners', async (req) => {
      return bpService.run(req.query); // Pass the query to the external service
  });
});