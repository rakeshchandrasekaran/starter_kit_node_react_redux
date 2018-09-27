const EventsApi = require('../api/integrations/events');

const getHomeSnapshot = (session, context) => {
  return EventsApi.getEvents(session.customerId, session.currentLoanNumber, context);
};