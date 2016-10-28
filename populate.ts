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
import http = require('https');

"use strict";

// WARNING: JS month is minus-1
let start: Date = new Date(2016, 8, 1, 8, 0);
let end: Date = new Date(2016, 11, 31, 23, 0);
let intermediate = new Date(2016, 9, 10, 13, 0);
// Every hour: 60*60*1000
let increment: number = 60*60*1000;
let timestampVariation: number = 5000;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
  populateMetric("aloha/789-654-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8, new Date(2016, 8, 4, 13, 0)/*, new Date(2016, 7, 22)*/);
  populateMetric("hola/654-987-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8);
  populateMetric("aloha/123-456-789/cpu/usage", MetricType.counter, 0, 100, 0.3);
  populateMetric("aloha/789-654-321/cpu/usage", MetricType.counter, 0, 100, 0.3, new Date(2016, 8, 4, 13, 0)/*, new Date(2016, 7, 22)*/);
  populateMetric("hola/654-987-321/cpu/usage", MetricType.counter, 0, 100, 0.3);
  populateAvailability("aloha/123-456-789/avail", 0.3);
  populateAvailability("aloha/789-654-321/avail", 0.3, new Date(2016, 8, 4, 13, 0)/*, new Date(2016, 7, 22)*/);
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
    host: 'metrics.192.168.42.63.xip.io',
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/raw',
    port: 443,
    headers: {
      'Content-Type': 'application/json',
      'Hawkular-Tenant': 'test',
      'Authorization': 'Bearer Exvx6p1aLITd3ZJVVvRtCTAzof4ANC1UT-dd-GreYiA'
    }
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
    host: 'metrics.192.168.42.63.xip.io',
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/tags',
    port: 443,
    headers: {
      'Content-Type': 'application/json',
      'Hawkular-Tenant': 'test',
      'Authorization': 'Bearer Exvx6p1aLITd3ZJVVvRtCTAzof4ANC1UT-dd-GreYiA'
    }
  }, response => {
    response.on('data', function (chunk) {
      body += chunk;
    });
    response.on('end',function() {
      console.log(body);
    });
  });
  req.write(JSON.stringify({
    app: app,
    container: container,
    counter: counter
  }));
  req.end();
}

run();
