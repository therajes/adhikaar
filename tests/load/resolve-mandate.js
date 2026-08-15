import http from 'k6/http'
import { check, sleep } from 'k6'

http.setResponseCallback(http.expectedStatuses(200, 400, 404, 429))

export const options = { vus: 5, duration: '15s', thresholds: { http_req_failed: ['rate<0.05'], http_req_duration: ['p(95)<1000'] } }
const endpoint = __ENV.RESOLVE_URL || 'http://127.0.0.1:54321/functions/v1/resolve-mandate'

export default function () {
  const payload = JSON.stringify({ verificationCode: 'ABC234', anonymousSessionHash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' })
  const response = http.post(endpoint, payload, { headers: { 'Content-Type': 'application/json' } })
  check(response, { 'uniform safe response': result => [200, 400, 404, 429].includes(result.status) })
  sleep(0.2)
}
