using apibusinesspartner from '../../db/external/API_BUSINESS_PARTNER';

service API_BUSINESS_PARTNER {
    entity A_BusinessPartner as projection on apibusinesspartner.A_BusinessPartner;
}
