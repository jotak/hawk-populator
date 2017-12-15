"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var http = require("http");
var HOSTNAME = '127.0.0.1';
var PORT = 8080;
var HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': 'Basic ' + new Buffer('jdoe:password').toString('base64'),
    'Hawkular-Tenant': 'test'
};
var now = new Date().getTime();
var start = new Date(now - 1000 * 60 * 60 * 24 * 30);
var intermediate = new Date(now - 1000 * 60 * 60 * 24 * 4);
var end = new Date(now + 1000 * 60 * 60 * 24 * 5);
var increment = 30 * 60 * 1000;
var timestampVariation = 5000;
var MetricType;
(function (MetricType) {
    MetricType[MetricType["gauge"] = 0] = "gauge";
    MetricType[MetricType["counter"] = 1] = "counter";
})(MetricType || (MetricType = {}));
function run() {
    var m1 = tag("gauges", "aloha/123-456-789/memory/usage{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "memory");
    var m2 = tag("gauges", "aloha/789-654-321/memory/usage{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "memory");
    var m3 = tag("gauges", "hola/654-987-321/memory/usage{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "memory");
    var m4 = tag("counters", "aloha/123-456-789/cpu/usage{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "cpu");
    var m5 = tag("counters", "aloha/789-654-321/cpu/usage{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "cpu");
    var m6 = tag("counters", "hola/654-987-321/cpu/usage{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "cpu");
    var m7 = tag("availability", "aloha/123-456-789/avail{namespace=test,pod=123-456-789,server=10.1.10.138:8080,service=aloha}", "aloha", "123-456-789", "avail");
    var m8 = tag("availability", "aloha/789-654-321/avail{namespace=test,pod=789-654-321,server=10.1.10.138:8080,service=aloha}", "aloha", "789-654-321", "avail");
    var m9 = tag("availability", "hola/654-987-321/avail{namespace=test,pod=654-987-321,server=10.1.10.138:8080,service=hola}", "hola", "654-987-321", "avail");
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
function vary(timestamp) {
    var variation = Math.floor(Math.random() * timestampVariation - (timestampVariation / 2));
    return timestamp + variation;
}
function populatePoint(lowRange, highRange, timestamp, stability, previousValue) {
    var value;
    if (previousValue === undefined || Math.random() > stability) {
        value = lowRange + Math.random() * (highRange - lowRange);
    }
    else {
        value = previousValue;
    }
    return {
        'timestamp': vary(timestamp),
        'value': value
    };
}
function populateAvailPoint(timestamp, stability, previousValue) {
    var value;
    if (previousValue === undefined || Math.random() > stability) {
        value = Math.random() < 0.2 ? "down" : "up";
    }
    else {
        value = previousValue;
    }
    return {
        'timestamp': vary(timestamp),
        'value': value
    };
}
function postToHawkular(metricId, type, dataPoints) {
    var body = '';
    var req = http.request({
        method: 'POST',
        host: HOSTNAME,
        path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/raw',
        port: PORT,
        headers: HEADERS
    }, function (response) {
        response.on('data', function (chunk) {
            body += chunk;
        });
        response.on('end', function () {
            console.log(body);
        });
    });
    console.log("Inserting data for " + metricId);
    console.log(JSON.stringify(dataPoints));
    req.write(JSON.stringify(dataPoints));
    req.end();
}
function populateMetric(metricId, type, lowRange, highRange, stability, overridenStart, overridenEnd) {
    var dataPoints = [];
    var timestamp = (overridenStart || start).getTime();
    var endTimestamp = (overridenEnd || end).getTime();
    var previousValue = undefined;
    var previousCounterValue = 0;
    while (timestamp < endTimestamp) {
        var point = populatePoint(lowRange, highRange, timestamp, stability, previousValue);
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
function populateAvailability(metricId, stability, overridenStart, overridenEnd) {
    var dataPoints = [];
    var timestamp = (overridenStart || start).getTime();
    var endTimestamp = (overridenEnd || end).getTime();
    var previousValue = undefined;
    while (timestamp < endTimestamp) {
        var point = populateAvailPoint(timestamp, stability, previousValue);
        previousValue = point.value;
        dataPoints.push(point);
        timestamp += increment;
    }
    postToHawkular(metricId, 'availability', dataPoints);
}
function tag(type, metricId, app, container, counter) {
    var body = '';
    var req = http.request({
        method: 'PUT',
        host: HOSTNAME,
        path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/tags',
        port: PORT,
        headers: HEADERS
    }, function (response) {
        response.on('data', function (chunk) {
            body += chunk;
        });
        response.on('end', function () {
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
