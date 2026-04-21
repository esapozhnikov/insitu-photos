import os
import logging
from urllib.parse import urlparse
from opentelemetry import trace, _logs, metrics
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

def setup_telemetry(service_name: str):
    # Check if already initialized to avoid "Overriding not allowed" errors
    try:
        # If it's already a TracerProvider (and not the default Proxy), we skip
        if not isinstance(trace.get_tracer_provider(), trace.ProxyTracerProvider):
            return trace.get_tracer(service_name)
    except:
        pass

    # Base URL for the Alloy collector
    env_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    
    if not env_endpoint or env_endpoint.lower() == "none":
        # Telemetry is disabled
        return trace.get_tracer(service_name)
    
    # Robust parsing of the endpoint for gRPC
    # Standard OTLP gRPC endpoint is usually just host:4317 (no http:// prefix)
    # But often users provide the HTTP endpoint (http://host:4318)
    parsed = urlparse(env_endpoint)
    hostname = parsed.hostname or parsed.path.split(':')[0]
    # Default to 4317 if not specified, or use the provided port if it's the gRPC one
    port = parsed.port
    if not port or port == 4318:
        port = 4317
    
    grpc_url = f"{hostname}:{port}"
    logging.info(f"Setting up telemetry for {service_name}. Source: {env_endpoint} -> gRPC: {grpc_url}")
    
    # Resource identifies the service
    env_name = os.getenv("OTEL_DEPLOYMENT_ENVIRONMENT", "production")
    service_version = os.getenv("OTEL_SERVICE_VERSION", "1.0.0")

    resource = Resource.create({
        SERVICE_NAME: service_name,
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: env_name,
        ResourceAttributes.SERVICE_VERSION: service_version,
    })
    
    # 1. Setup Traces
    # We use gRPC on port 4317 for better performance
    trace_provider = TracerProvider(resource=resource)
    trace_exporter = OTLPSpanExporter(endpoint=grpc_url, insecure=True)
    trace_processor = BatchSpanProcessor(trace_exporter)
    trace_provider.add_span_processor(trace_processor)
    
    try:
        trace.set_tracer_provider(trace_provider)
    except ValueError:
        pass # Already set
    
    # 2. Setup Logs
    log_provider = LoggerProvider(resource=resource)
    log_exporter = OTLPLogExporter(endpoint=grpc_url, insecure=True)
    log_processor = BatchLogRecordProcessor(log_exporter)
    log_provider.add_log_record_processor(log_processor)
    
    try:
        _logs.set_logger_provider(log_provider)
    except ValueError:
        pass # Already set

    # 3. Setup Metrics
    metric_exporter = OTLPMetricExporter(endpoint=grpc_url, insecure=True)
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    
    try:
        metrics.set_meter_provider(metric_provider)
    except ValueError:
        pass # Already set
    
    # Bridge Python logging to OpenTelemetry
    # We only want to add the handler once
    root_logger = logging.getLogger()
    if not any(isinstance(h, LoggingHandler) for h in root_logger.handlers):
        handler = LoggingHandler(level=logging.NOTSET, logger_provider=log_provider)
        root_logger.addHandler(handler)
        root_logger.setLevel(logging.INFO)
    
    return trace.get_tracer(service_name)

# Default tracer for use in tasks/utils
tracer = trace.get_tracer("insitu-photos-backend")

# Default meter for use in tasks/utils
meter = metrics.get_meter("insitu-photos-backend")
