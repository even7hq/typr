export { Logger } from "./Logger";
export { LoggerLokiRouting } from "./LoggerLokiRouting";
export { LoggerSidecar } from "./LoggerSidecar";
export {
    DEFAULT_LOG_LEVEL,
    LOG_LEVELS,
    LOG_LEVEL_TO_OTEL_SEVERITY,
    isValidLogLevel,
    levelToOtelSeverity
} from "./LoggerLevels";
export type {
    FileRotationOptions,
    LogLevel,
    LogRecord,
    LogSink,
    LoggerInstanceIntrospection,
    LoggerIntrospection,
    LoggerOptions,
    LoggerRedactionProfile,
    RedactionOptions,
    RedactorRef,
    SidecarLogger,
    SinkBuildContext,
    SinkCategory,
    TransportDescriptor,
    TyprLogger
} from "./LoggerTypes";

export { ConsoleSink } from "./sinks/ConsoleSink";
export { CustomSink, type CustomSinkOptions } from "./sinks/CustomSink";
export { FileSink, type FileSinkOptions } from "./sinks/FileSink";
export { OtelSink, type OtelSinkOptions } from "./sinks/OtelSink";
export { TyprSink, type TyprSinkMode, type TyprSinkOptions } from "./sinks/TyprSink";

export { CustomSplat, type CustomSplatOptions } from "./formats/CustomSplat";
export { ErrorLogUtils } from "./formats/ErrorLogUtils";
export { LogLine, type LogLineOptions } from "./formats/LogLine";
export {
    AmexRedactor,
    AwsAccessKeyRedactor,
    BearerRedactor,
    CnpjRedactor,
    CpfRedactor,
    CreditCardRedactor,
    EmailRedactor,
    GithubTokenRedactor,
    HexSecretRedactor,
    JwtRedactor,
    PhoneIntlRedactor,
    RedactionProfile,
    RedactorPackSelection,
    RecommendedRedactorPack,
    RegexSecretRedactor,
    SecretRedaction,
    SlackTokenRedactor,
    type SecretRedactor,
    XAccessTokenRedactor
} from "./formats/SecretRedaction";

export { OtlpHeaders } from "./otel/OtlpHeaders";
export type { OtelCircuitBreakerOptions } from "./otel/OtelCircuitBreakerOptions";
export { OtlpLogExportProcessor, type OtlpLogExportProcessorOptions } from "./otel/OtlpLogExportProcessor";
export {
    buildOtelSinkOptionsFromEnv,
    isOtelLogsExportEnabled,
    readTelemetryConfig,
    resolveTelemetryServiceName,
    type TelemetryEnvConfig
} from "./otel/TelemetryConfig";
export { enableOtelFromEnv } from "./otel/EnableOtelFromEnv";
export { formatWinstonLogBody, isWinstonAttributeKey } from "./otel/WinstonLogMessageFormat";
