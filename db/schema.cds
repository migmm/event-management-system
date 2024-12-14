using { managed } from '@sap/cds/common';

namespace eventmanagement;

entity Event : managed {
    key ID              : Integer;
    name               : String(100);
    startDate          : Date;
    endDate            : Date;
    location           : String(255);
    description        : String(1000);
    isActive           : Boolean default true;
    isCancelled        : Boolean default false;
    cancellationReason : String(500);
    participants       : Association to many Participant on participants.event = $self;
}

entity Participant : managed {
    key ID               : Integer;
    firstName           : String(50);
    lastName            : String(50);
    email               : String(100);
    phone               : String(20);
    businessPartnerID   : String(50); // Foreign Key to Business Partner API
    event               : Association to Event;
}