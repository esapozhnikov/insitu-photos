import os
import logging
from urllib.parse import urlparse
from opentelemetry import trace, _logs, metrics
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader

def setup_telemetry(service_name: str):
    # Check if already initialized to avoid "Overriding not allowed" errors
    try:
        # If it's already a TracerProvider (and not the default Proxy), we skip
        if not isinstance(trace.get_tracer_provider(), trace.ProxyTracerProvider):
            return trace.get_tracer(service_name)
    except Exception:
        pass

    # Base URL for the collector
    env_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not env_endpoint or env_endpoint.lower() == "none":
        # Telemetry is disabled
        return trace.get_tracer(service_name)

    # Determine protocol: explicitly from env or inferred from port
    protocol = os.getenv("OTEL_EXPORTER_OTLP_PROTOCOL", "").lower()
    parsed = urlparse(env_endpoint)
    
    # If no protocol is set, infer from port
    if not protocol:
        if parsed.port == 4318:
            protocol = "http/protobuf"
        else:
            protocol = "grpc"

    # Resource identifies the service
    env_name = os.getenv("OTEL_DEPLOYMENT_ENVIRONMENT", "production")
    service_version = os.getenv("OTEL_SERVICE_VERSION", "1.0.0")

    resource = Resource.create({
        SERVICE_NAME: service_name,
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: env_name,
        ResourceAttributes.SERVICE_VERSION: service_version,
    })

    # Initialize exporters based on protocol
    if protocol in ["http/protobuf", "http"]:
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter as HTTPSpanExporter
        from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter as HTTPLogExporter
        from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter as HTTPMetricExporter
        
        logging.info(f"Setting up OTLP/HTTP telemetry for {service_name} at {env_endpoint}")
        
        # OTLP/HTTP expects specific paths if not provided in endpoint
        trace_exporter = HTTPSpanExporter(endpoint=f"{env_endpoint}/v1/traces")
        log_exporter = HTTPLogExporter(endpoint=f"{env_endpoint}/v1/logs")
        metric_exporter = HTTPMetricExporter(endpoint=f"{env_endpoint}/v1/metrics")
    else:
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter as GRPCSpanExporter
        from opentelemetry.exporter.otlp.proto.grpc._log_exporter import OTLPLogExporter as GRPCLogExporter
        from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter as GRPCMetricExporter
        
        # Standard OTLP gRPC endpoint is usually just host:4317 (no http:// prefix)
        hostname = parsed.hostname or parsed.path.split(':')[0]
        port = parsed.port or 4317
        grpc_url = f"{hostname}:{port}"
        
        logging.info(f"Setting up OTLP/gRPC telemetry for {service_name} at {grpc_url}")
        
        trace_exporter = GRPCSpanExporter(endpoint=grpc_url, insecure=True)
        log_exporter = GRPCLogExporter(endpoint=grpc_url, insecure=True)
        metric_exporter = GRPCMetricExporter(endpoint=grpc_url, insecure=True)
    
    # 1. Setup Traces
    trace_provider = TracerProvider(resource=resource)
    trace_processor = BatchSpanProcessor(trace_exporter)
    trace_provider.add_span_processor(trace_processor)
    try:
        trace.set_tracer_provider(trace_provider)
    except ValueError:
        pass # Already set
    
    # 2. Setup Logs
    log_provider = LoggerProvider(resource=resource)
    log_processor = BatchLogRecordProcessor(log_exporter)
    log_provider.add_log_record_processor(log_processor)
    try:
        _logs.set_logger_provider(log_provider)
    except ValueError:
        pass # Already set

    # 3. Setup Metrics
    metric_reader = PeriodicExportingMetricReader(metric_exporter)
    metric_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
    try:
        metrics.set_meter_provider(metric_provider)
    except ValueError:
        pass # Already set
    
    # Bridge Python logging to OpenTelemetry
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
