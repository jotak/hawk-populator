/*
 * Copyright 2014-2017 Joel Takvorian, https://github.com/jotak/hawk-populator
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import http = require('http');

// HAWKULAR CONFIG
const HOSTNAME = '127.0.0.1';
const PORT = 8080;
const HEADERS = {
  'Content-Type': 'application/json'
};

const content: any = {
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
    },{
      name: "gc1",
      type: "GC",
      unit: "BYTES",
      collectionInterval: 10,
      properties: {}
    }],
    properties: {}
  },{
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
    },{
      name: "gc2",
      type: "GC",
      unit: "BYTES",
      collectionInterval: 10,
      properties: {}
    }],
    properties: {}
  },{
    id: "child-1",
    name: "Child 1",
    typeId: "FOO",
    root: false,
    childrenIds: [],
    metrics: [],
    properties: {}
  },{
    id: "child-2",
    name: "Child 2",
    typeId: "BAR",
    root: false,
    childrenIds: [],
    metrics: [],
    properties: {}
  },{
    id: "child-3",
    name: "Child 3",
    typeId: "FOO",
    root: false,
    childrenIds: [],
    metrics: [],
    properties: {}
  },{
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
    },{
      name: "Shutdown",
      parameters: {
        "restart": {
          "type": "bool",
          "description": "If set true, the server will restart after shutdown"
        }
      }
    }],
    properties: {}
  },{
    id: "FOO",
    operations: [],
    properties: {}
  },{
    id: "BAR",
    operations: [],
    properties: {}
  }]
};

let resBody = '';
const req = http.request({
  method: 'POST',
  host: HOSTNAME,
  path: '/hawkular/inventory/import',
  port: PORT,
  headers: HEADERS
}, response => {
  response.on('data', function (chunk) {
    resBody += chunk;
  });
  response.on('end',function() {
    console.log(resBody);
  });
});
console.log("Inserting inventory data");
const reqBody = JSON.stringify(content);
console.log(reqBody);
req.write(reqBody);
req.end();
