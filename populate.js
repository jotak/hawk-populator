"use strict";
var http = require('http');
"use strict";
var start = new Date(2016, 8, 1, 8, 0);
var end = new Date(2016, 9, 31, 23, 0);
var intermediate = new Date(2016, 9, 1, 13, 0);
var increment = 60 * 60 * 1000;
var timestampVariation = 5000;
var MetricType;
(function (MetricType) {
    MetricType[MetricType["gauge"] = 0] = "gauge";
    MetricType[MetricType["counter"] = 1] = "counter";
})(MetricType || (MetricType = {}));
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
    populateMetric("aloha/789-654-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8, new Date(2016, 8, 4, 13, 0));
    populateMetric("hola/654-987-321/memory/usage", MetricType.gauge, 200000000, 600000000, 0.8);
    populateMetric("aloha/123-456-789/cpu/usage", MetricType.counter, 0, 100, 0.3);
    populateMetric("aloha/789-654-321/cpu/usage", MetricType.counter, 0, 100, 0.3, new Date(2016, 8, 4, 13, 0));
    populateMetric("hola/654-987-321/cpu/usage", MetricType.counter, 0, 100, 0.3);
    populateAvailability("aloha/123-456-789/avail", 0.3);
    populateAvailability("aloha/789-654-321/avail", 0.3, new Date(2016, 8, 4, 13, 0));
    populateAvailability("hola/654-987-321/avail", 0.3);
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
        host: '127.0.0.1',
        path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/raw',
        port: 8080,
        headers: {
            'Content-Type': 'application/json',
            'Hawkular-Tenant': 'dev'
        }
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
        host: '127.0.0.1',
        path: '/hawkular/metrics/' + type + '/' + encodeURIComponent(metricId) + '/tags',
        port: 8080,
        headers: {
            'Content-Type': 'application/json',
            'Hawkular-Tenant': 'dev'
        }
    }, function (response) {
        response.on('data', function (chunk) {
            body += chunk;
        });
        response.on('end', function () {
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
