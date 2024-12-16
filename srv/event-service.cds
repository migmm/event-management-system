using eventmanagement from '../db/schema';
using API_BUSINESS_PARTNER from './external/API_BUSINESS_PARTNER-service';

service ManagementService {
    entity Events       as projection on eventmanagement.Event;
    entity Participants as projection on eventmanagement.Participant;
    
    entity BusinessPartners as projection on API_BUSINESS_PARTNER.A_BusinessPartner;

    action registerParticipant(eventID : Integer, participantID : Integer) returns Boolean;
    action cancelEvent(eventID : Integer, reason : String)                 returns Boolean;
    action reopenEvent(eventID : Integer)                                  returns Boolean;
}