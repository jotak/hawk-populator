"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var HOSTNAME = '127.0.0.1';
var PORT = 8080;
var HEADERS = {
    'Content-Type': 'application/json'
};
var content = {
    resources: [{
            id: "EAP-1",
            name: "EAP-1",
            typeId: "EAP",
            root: true,
            childrenIds: ["child-1", "child-2"],
            metrics: [{
                    name: "memory1",
                    type: "Memory",
                    unit: "BYTES",
                    collectionInterval: 10,
                    properties: {}
                }, {
                    name: "gc1",
                    type: "GC",
                    unit: "BYTES",
                    collectionInterval: 10,
                    properties: {}
                }],
            properties: {}
        }, {
            id: "EAP-2",
            name: "EAP-2",
            typeId: "EAP",
            root: true,
            childrenIds: ["child-3", "child-4"],
            metrics: [{
                    name: "memory2",
                    type: "Memory",
                    unit: "BYTES",
                    collectionInterval: 10,
                    properties: {}
                }, {
                    name: "gc2",
                    type: "GC",
                    unit: "BYTES",
                    collectionInterval: 10,
                    properties: {}
                }],
            properties: {}
        }, {
            id: "child-1",
            name: "Child 1",
            typeId: "FOO",
            root: false,
            childrenIds: [],
            metrics: [],
            properties: {}
        }, {
            id: "child-2",
            name: "Child 2",
            typeId: "BAR",
            root: false,
            childrenIds: [],
            metrics: [],
            properties: {}
        }, {
            id: "child-3",
            name: "Child 3",
            typeId: "FOO",
            root: false,
            childrenIds: [],
            metrics: [],
            properties: {}
        }, {
            id: "child-4",
            name: "Child 4",
            typeId: "BAR",
            root: false,
            childrenIds: [],
            metrics: [],
            properties: {}
        }],
    types: [{
            id: "EAP",
            operations: [{
                    name: "Reload",
                    parameters: {}
                }, {
                    name: "Shutdown",
                    parameters: {
                        "restart": {
                            "type": "bool",
                            "description": "If set true, the server will restart after shutdown"
                        }
                    }
                }],
            properties: {}
        }, {
            id: "FOO",
            operations: [],
            properties: {}
        }, {
            id: "BAR",
            operations: [],
            properties: {}
        }]
};
var resBody = '';
var req = http.request({
    method: 'POST',
    host: HOSTNAME,
    path: '/hawkular/inventory/import',
    port: PORT,
    headers: HEADERS
}, function (response) {
    response.on('data', function (chunk) {
        resBody += chunk;
    });
    response.on('end', function () {
        console.log(resBody);
    });
});
console.log("Inserting inventory data");
var reqBody = JSON.stringify(content);
console.log(reqBody);
req.write(reqBody);
req.end();
