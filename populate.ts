/*
The MIT License (MIT)
Copyright (c) 2015 Joel Takvorian, https://github.com/jotak/homeblocks
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import http = require('http');

"use strict";

// WARNING: JS month is minus-1
let start: Date = new Date(2016, 8, 1, 8, 0);
let end: Date = new Date(2016, 9, 31, 23, 0);
let intermediate = new Date(2016, 9, 1, 13, 0);
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
    host: '127.0.0.1',
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/raw',
    port: 8080,
    headers: {
      'Content-Type': 'application/json',
      'Hawkular-Tenant': 'dev'
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
    host: '127.0.0.1',
    path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/tags',
    port: 8080,
    headers: {
      'Content-Type': 'application/json',
      'Hawkular-Tenant': 'dev'
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
