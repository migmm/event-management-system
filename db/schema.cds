using { managed } from '@sap/cds/common';

namespace eventmanagement;

entity Event : managed {
    key ID                 : Integer;
        Name               : String(255);
        StartDate          : Date;
        EndDate            : Date;
        Location           : String(255);
        Description        : String(1000);
        IsActive           : Boolean default true;
        IsCancelled        : Boolean default false;
        CancellationReason : String(500);
        Participants       : Association to many Participant
                                 on Participants.Event = $self;
}

entity Participant : managed {
    key ID                : Integer;
        FirstName         : String(100);
        LastName          : String(100);
        Email             : String(150);
        Phone             : String(50);
        BusinessPartnerID : String(50);
        Event             : Association to Event;
}
