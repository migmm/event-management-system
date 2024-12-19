using { managed } from '@sap/cds/common';

namespace eventmanagement;

entity Event : managed {
    key ID : Integer;

    @mandatory @assert: { range: { min: 1, max: 255 }, 
    message: 'The name must be between 1 and 255 characters.' }
    Name : String(255);

    @mandatory @assert: { format: 'yyyy-MM-dd', 
    message: 'The start date must be in yyyy-MM-dd format.' }
    StartDate : Date;

    @mandatory @assert: { format: 'yyyy-MM-dd', 
    message: 'The end date must be in yyyy-MM-dd format.' }
    EndDate : Date;

    @mandatory @assert: { range: { min: 1, max: 255 }, 
    message: 'The location must be between 1 and 255 characters.' }
    Location : String(255);

    @mandatory @assert: { range: { min: 1, max: 1000 }, 
    message: 'The description must be between 1 and 1000 characters.' }
    Description : String(1000);

    IsActive : Boolean default true;
    IsCancelled : Boolean default false;

    @assert: { range: { min: 1, max: 500 }, 
    message: 'The cancellation reason must be between 1 and 500 characters.' }
    CancellationReason : String(500);

    Participants : Association to many Participant
                       on Participants.Event = $self;
}


entity Participant : managed {
    key ID : Integer;

    @mandatory @assert: { range: { min: 2, max: 100 }, 
    message: 'The first name must be between 2 and 100 characters.' }
    FirstName : String(100);

    @mandatory @assert: { range: { min: 2, max: 100 }, 
    message: 'The last name must be between 2 and 100 characters.' }
    LastName : String(100);

    @mandatory @assert: { range: { min: 5, max: 100 }, 
    message: 'Insert a valid email.' }
    Email : String(150);

    @mandatory @assert: { range: { min: 1, max: 50 }, 
    message: 'The phone number must be between 1 and 50 characters.' }
    Phone : String(50);

    @mandatory @assert: { range: { min: 1, max: 50 }, 
    message: 'The business partner ID must be between 1 and 50 characters.' }
    BusinessPartnerID : String(50);

    Event : Association to Event;
}