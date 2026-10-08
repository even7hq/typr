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
export {
    createOtlpLogRecordProcessor,
    type CreateOtlpLogRecordProcessorOptions
} from "./otel/CreateOtlpLogRecordProcessor";
export { OtlpLogExportProcessor, type OtlpLogExportProcessorOptions } from "./otel/OtlpLogExportProcessor";
export {
    OtlpLogWalExportProcessor,
    type OtlpLogWalExportProcessorOptions
} from "./otel/wal/OtlpLogWalExportProcessor";
export {
    DEFAULT_LOG_WAL_DB_FILE,
    DEFAULT_MAX_BACKLOG_ENTRIES,
    resolveDefaultLogWalDbPath,
    resolveLogWalOptions,
    type LogWalOptions,
    type ResolvedLogWalOptions
} from "./otel/wal/LogWalConfig";
export { LogWalStream } from "./otel/wal/LogWalStream";
export { LogWalDatabase, type LogWalEntryRow } from "./otel/wal/LogWalDatabase";
export {
    buildOtelSinkOptionsFromEnv,
    isOtelLogsExportEnabled,
    readTelemetryConfig,
    resolveLogWalFromEnv,
    resolveTelemetryServiceName,
    type TelemetryEnvConfig
} from "./otel/TelemetryConfig";
export { enableOtelFromEnv } from "./otel/EnableOtelFromEnv";
export { formatWinstonLogBody, isWinstonAttributeKey } from "./otel/WinstonLogMessageFormat";
