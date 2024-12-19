# API EVENTS MANAGER
<img align="center" src="assets/sap-logo.png" alt="Sap logo"/>

There is an [English version](README.md) of this file.

Este README proporciona una visión general de la API de Tickets de Eventos, incluyendo instrucciones sobre cómo usarla, rutas disponibles y detalles sobre su implementación.

Este proyecto es parte del un *Entregable del Bootcamp SAP CAP de Globant.*


## Introducción

El entregable consiste en entregar un proyecto realizado en SAP CAP y deployado en Cloud Foundry.

La API permite la gestión de eventos, tickets y usuarios. Proporciona operaciones CRUD para cada entidad e incluye un endpoint personalizado para la compra de tickets.

## Requisitos

    Node.js (v18 o superior)
    npm (v6 o superior)
    CAP Framework
    Base de Datos HANA

## Cómo Ejecutar la aplicación

Clonar el repositorio:

```sh
git clone https://github.com/migmm/events-manager.git
cd events-manager
```

Instalar las dependencias:

```sh
npm install
```

Iniciar el servicio:

```sh
cds watch --profile hybrid
```

Necesitás tener HANA activado para cargar y trabajar con las tablas de datos proporcionada.

## Deploy

Para la lógica extra se realizó en Javscript usando this.before y this.on

Se creó una entidad extra con los datos del Api Business Partner

Se separaron las entidades de los servicios.

Para que el codigo quede mas claro de leer, las verificaciones de ingreso de datos se realizaron mediante un *this.before*

Los errores fueron modelados para ser uniformes con los que retorna SAP CAP

## Relaciones entre entidades

Las relaciones entre entidades es Evento a Participante 1:N explícitamente y Participante a BusinessPartner está determinada implícitamente, ya que es una clave foranea y está manejada por CAP.

## Validaciones y verificaciones

Se implementaron validaciones tanto a nivel entidad como en el codigo js. 
En las entidades se validaron el tipo que se inserta y el rango asi como el formato.

Las verificaciones se realziaron de acuerdo a lo requerido, ej: si el participante que se agrega a un evento se agrega correctamente. para eso se uso el hook *after* de CAP.

## Testing

Para hacer mas fácil el testeo se decidió no incluir autenticación.

Se incluyó un archivo http para testear local y deployado y una colección postman, incluyendo request tanto como ingresando datos correctos como también ingresando datos erroneos.


## Mensajes

Los mensajes de error como los de sucess fueron formateados igual al formato estandar de CAP.

## Fuentes

https://community.sap.com/t5/technology-q-a/error-during-request-to-remote-service-failed-to-load-destination/qaq-p/13773565
