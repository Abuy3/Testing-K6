import http from 'k6/http';
import { check, sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.1/index.js";

// Base URL untuk testing
const BASE_URL = 'https://jsonplaceholder.typicode.com';

export const options = {
    scenarios: {
        // Scenario 1: Constant Load Test
        constant_load: {
            executor: 'constant-vus',
            vus: 50,
            duration: '1m',
            exec: 'constantLoadScenario',
            startTime: '0s',
        },
        // Scenario 2: Ramp-up Test
        ramp_up: {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: '30s', target: 20 },
                { duration: '30s', target: 50 },
                { duration: '30s', target: 0 },
            ],
            exec: 'rampUpScenario',
            startTime: '1m',
        },
        // Scenario 3: Stress Test
        stress_test: {
            executor: 'ramping-arrival-rate',
            preAllocatedVUs: 50,
            timeUnit: '1s',
            stages: [
                { duration: '30s', target: 10 },
                { duration: '1m', target: 50 },
                { duration: '30s', target: 0 },
            ],
            exec: 'stressTestScenario',
            startTime: '2m30s',
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95% requests should be below 2s
        http_req_failed: ['rate<0.1'],     // Less than 10% requests should fail
    }
};

// Scenario 1: Constant Load Test - Testing Users API
export function constantLoadScenario() {
    // Get random user (1-100)
    const userId = Math.floor(Math.random() * 10) + 1;
    const response = http.get(`${BASE_URL}/users/${userId}`);
    
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'has user data': (r) => r.json().id !== undefined,
    });
    
    sleep(1);
}

// Scenario 2: Ramp-up Test - Testing Posts API
export function rampUpScenario() {
    const payload = JSON.stringify({
        title: 'Test Post Load',
        body: 'This is a test post for load testing',
        userId: 1
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const response = http.post(`${BASE_URL}/posts`, payload, params);
    
    check(response, {
        'status is 201': (r) => r.status === 201,
        'response time < 1s': (r) => r.timings.duration < 1000,
        'post created': (r) => r.json().id !== undefined,
    });
    
    sleep(1);
}

// Scenario 3: Stress Test - Testing Multiple Endpoints
export function stressTestScenario() {
    const responses = http.batch([
        ['GET', `${BASE_URL}/users/1`],
        ['GET', `${BASE_URL}/posts/1`],
        ['GET', `${BASE_URL}/comments?postId=1`],
    ]);
    
    responses.forEach((response, index) => {
        check(response, {
            'status is 200': (r) => r.status === 200,
            'response time < 2s': (r) => r.timings.duration < 2000,
            'has valid data': (r) => r.json().length !== undefined || r.json().id !== undefined,
        });
    });
    
    sleep(2);
}

// Handle test completion and generate reports
export function handleSummary(data) {
    return {
        "summary.html": htmlReport(data),
        "summary.txt": textSummary(data, { indent: " ", enableColors: true }),
    };
}