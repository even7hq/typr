/**
 * Circuit breaker tuning for OTLP log export (sink and processor).
 */
export interface OtelCircuitBreakerOptions {
    failureThreshold?: number;
    openDurationMs?: number;
}
