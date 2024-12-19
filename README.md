API EVENTS MANAGER
<img align="center" src="assets/sap-logo.png" alt="Sap logo"/>

Hay una [Versión en español](README_es.md) de este archivo.

This README provides an overview of the Event Tickets API, including instructions on how to use it, available routes, and details about its implementation.

This project is part of a *Deliverable for the SAP CAP Bootcamp at Globant.*

## Introduction

The deliverable involves delivering a project built with SAP CAP and deployed on Cloud Foundry.

The API allows for the management of events, tickets, and users. It provides CRUD operations for each entity and includes a custom endpoint for purchasing tickets.

## Requirements

    Node.js (v18 or higher)
    npm (v6 or higher)
    CAP Framework
    HANA Database

## How to Run the Application

Clone the repository:

```sh

git clone https://github.com/migmm/events-manager.git
cd events-manager
```

Install the dependencies:

```sh
npm install
```

Start the service:

```sh
cds watch --profile hybrid
```

You need to have HANA activated to load and work with the provided data tables.

## Deployment

For the extra logic, JavaScript was used with this.before and this.on.

An additional entity was created to store data from the API Business Partner.

The entities were separated from the services.

To make the code more readable, data entry verifications were performed using this.before.

Errors were modeled to be consistent with those returned by SAP CAP.

## Relationships Between Entities

The relationships between entities are: Event to Participant (1:N ) explicitly, and Participant to BusinessPartner implicitly, as it is a foreign key and is handled by CAP.
Validations and Verifications

Validations were implemented at both the entity level and in the JavaScript code.
In the entities, the type, range, and format were validated.

Verifications were performed according to the requirements, e.g., whether the participant added to an event is added correctly. For this, the CAP after hook was used.

## Testing

To make testing easier, authentication was not included.

An HTTP file was included for local and deployed testing, as well as a Postman collection, including requests with both correct and incorrect data.

## Messages

Error messages and success messages were formatted to match the standard CAP format.

##  Sources

https://community.sap.com/t5/technology-q-a/error-during-request-to-remote-service-failed-to-load-destination/qaq-p/13773565