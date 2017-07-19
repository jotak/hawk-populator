/*
 * Copyright 2014-2016 Joel Takvorian, https://github.com/jotak/hawk-populator
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
  'Content-Type': 'application/json',
//  'Authorization': 'Basic ' + new Buffer('myUsername:myPassword').toString('base64'),
  'Hawkular-Tenant': 'test'
};

// WARNING: JS month is minus-1
const start: Date = new Date(2017, 6, 10, 8, 0);
const intermediate = new Date(2017, 6, 15, 13, 0);
const end: Date = new Date(2017, 6, 20, 23, 0);
// Every hour: 60*60*1000
let increment: number = 60*60*1000;
let timestampVariation: number = 5000;

enum MetricType {
  gauge,
  counter
}

function run() {
  tag("gauges", "aloha/123-456-789/memory/usage", "aloha", "123-456-789", "memory");
  tag("gauges", "aloha/789-654-321/memory/usage", "aloha", "789-654-321", "memory");
  tag("gauges", "hola/654-987-321/memory/usage", "hola", "654-987-321", "memory");
  tag("counters", "aloha/123-456-789/cpu/usage", "aloha", "123-456-789", "cpu");
  tag("counters", "aloha/789-654-321/cpu/usage", "aloha", "789-654-321", "cpu");
  tag("counters", "hola/654-987-321/cpu/usage", "hola", "654-987-321", "cpu");
  tag("availability", "aloha/123-456-789/avail", "aloha", "123-456-789", "avail");
  tag("availability", "aloha/789-654-321/avail", "aloha", "789-654-321", "avail");
  tag("availability", "hola/654-987-321/avail", "hola", "654-987-321", "avail");
  populateMetric("aloha/123-456-789/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8);
  populateMetric("aloha/789-654-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8, intermediate);
  populateMetric("hola/654-987-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8);
  populateMetric("aloha/123-456-789/cpu/usage", MetricType.counter, 0, 100, 0.3);
  populateMetric("aloha/789-654-321/cpu/usage", MetricType.counter, 0, 100, 0.3, intermediate);
  populateMetric("hola/654-987-321/cpu/usage", MetricType.counter, 0, 100, 0.3);
  populateAvailability("aloha/123-456-789/avail", 0.3);
  populateAvailability("aloha/789-654-321/avail", 0.3, intermediate);
  populateAvailability("hola/654-987-321/avail", 0.3);
}

function vary(timestamp: number): number {
  let variation = Math.floor(Math.random() * timestampVariation - (timestampVariation/2));
  return timestamp + variation;
}

function populatePoint(lowRange: number, highRange: number, timestamp: number, stability: number, previousValue?: number) {
  var value;
  if (previousValue === undefined || Math.random() > stability) {
    value = lowRange + Math.random() * (highRange - lowRange);
  } else {
    value = previousValue;
  }
  return {
    'timestamp': vary(timestamp),
    'value': value
  }
}

function populateAvailPoint(timestamp: number, stability: number, previousValue?: string) {
  var value: string;
  if (previousValue === undefined || Math.random() > stability) {
    value = Math.random() < 0.2 ? "down" : "up";
  } else {
    value = previousValue;
  }
  return {
    'timestamp': vary(timestamp),
    'value': value
  }
}

function postToHawkular(metricId: string, type: string, dataPoints: any) {
  var body = '';
  let req = http.request({
    method: 'POST',
    host: HOSTNAME,
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/raw',
    port: PORT,
    headers: HEADERS
  }, response => {
    response.on('data', function (chunk) {
      body += chunk;
    });
    response.on('end',function() {
      console.log(body);
    });
  });
  console.log("Inserting data for " + metricId);
  console.log(JSON.stringify(dataPoints));
  req.write(JSON.stringify(dataPoints));
  req.end();
}

function populateMetric(metricId: string, type: MetricType, lowRange: number, highRange: number, stability: number, overridenStart?: Date, overridenEnd?: Date) {
  var dataPoints = [];
  let timestamp: number = (overridenStart || start).getTime();
  let endTimestamp: number = (overridenEnd || end).getTime();
  var previousValue: number = undefined;
  var previousCounterValue: number = 0;
  while (timestamp < endTimestamp) {
    let point = populatePoint(lowRange, highRange, timestamp, stability, previousValue);
    previousValue = point.value;
    if (type === MetricType.counter) {
      point.value += previousCounterValue;
      previousCounterValue = point.value;
    }
    dataPoints.push(point);
    timestamp += increment;
  }
  postToHawkular(metricId, type === MetricType.gauge ? 'gauges' : 'counters', dataPoints);
}

function populateAvailability(metricId: string, stability: number, overridenStart?: Date, overridenEnd?: Date) {
  var dataPoints = [];
  let timestamp: number = (overridenStart || start).getTime();
  let endTimestamp: number = (overridenEnd || end).getTime();
  var previousValue: string = undefined;
  while (timestamp < endTimestamp) {
    let point = populateAvailPoint(timestamp, stability, previousValue);
    previousValue = point.value;
    dataPoints.push(point);
    timestamp += increment;
  }
  postToHawkular(metricId, 'availability', dataPoints);
}

function tag(type: string, metricId: string, app: string, container: string, counter: string) {
  var body = '';
  let req = http.request({
    method: 'PUT',
    host: HOSTNAME,
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/tags',
    port: PORT,
    headers: HEADERS
  }, response => {
    response.on('data', function (chunk) {
      body += chunk;
    });
    response.on('end',function() {
      console.log(body);
    });
  });
  req.write(JSON.stringify({
    container_name: app,
    pod_id: container,
    descriptor_name: counter
  }));
  req.end();
}

run();
