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
  'Authorization': 'Basic ' + new Buffer('jdoe:password').toString('base64'),
  'Hawkular-Tenant': 'test'
};

// WARNING: JS month is minus-1
// const start: Date = new Date(2017, 6, 10, 8, 0);
// const intermediate = new Date(2017, 6, 15, 13, 0);
// const end: Date = new Date(2017, 7, 30, 23, 0);
const now = new Date().getTime();
const start = new Date(now - 1000*60*60*24*30);
const intermediate = new Date(now - 1000*60*60*24*4);
const end = new Date(now + 1000*60*60*24*5);
// Every hour: 60*60*1000
let increment: number = 30*60*1000;
let timestampVariation: number = 5000;

enum MetricType {
  gauge,
  counter
}

function run() {
  const m1 = tag("gauges", "aloha/123-456-789/memory/usage{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "memory");
  const m2 = tag("gauges", "aloha/789-654-321/memory/usage{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "memory");
  const m3 = tag("gauges", "hola/654-987-321/memory/usage{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "memory");
  const m4 = tag("counters", "aloha/123-456-789/cpu/usage{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "cpu");
  const m5 = tag("counters", "aloha/789-654-321/cpu/usage{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "cpu");
  const m6 = tag("counters", "hola/654-987-321/cpu/usage{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "cpu");
  const m7 = tag("availability", "aloha/123-456-789/avail{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "avail");
  const m8 = tag("availability", "aloha/789-654-321/avail{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "avail");
  const m9 = tag("availability", "hola/654-987-321/avail{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "avail");
  populateMetric(m1, MetricType.gauge, 200000000, 600000000, 0.8);
  populateMetric(m2, MetricType.gauge, 200000000, 600000000, 0.8, intermediate);
  populateMetric(m3, MetricType.gauge, 200000000, 600000000, 0.8);
  populateMetric(m4, MetricType.counter, 0, 100, 0.3);
  populateMetric(m5, MetricType.counter, 0, 100, 0.3, intermediate);
  populateMetric(m6, MetricType.counter, 0, 100, 0.3);
  populateAvailability(m7, 0.3);
  populateAvailability(m8, 0.3, intermediate);
  populateAvailability(m9, 0.3);
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
  return metricId;
}

run();
