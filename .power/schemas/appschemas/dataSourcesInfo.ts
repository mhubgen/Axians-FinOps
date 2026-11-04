/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "mzaxians_annualbudgets": {
    "tableId": "",
    "version": "",
    "primaryKey": "mzaxians_annualbudgetid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "webcontents": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "GetFileContent": {
        "path": "/{connectionId}/GetFileContent",
        "method": "GET",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "path",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "200": {
            "type": "string",
            "format": "binary"
          },
          "default": {
            "type": "object"
          }
        }
      },
      "InvokeHttp": {
        "path": "/{connectionId}/codeless/InvokeHttp",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "request",
            "in": "body",
            "required": true,
            "type": "object"
          }
        ],
        "responseInfo": {
          "default": {
            "type": "object"
          }
        }
      }
    }
  }
};
