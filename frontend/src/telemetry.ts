import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export const setupTelemetry = () => {
  const endpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint || endpoint.toLowerCase() === 'none') {
    return;
  }

  // Alloy OTLP HTTP receiver endpoint
  const exporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  });

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'insitu-photos-frontend',
    }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  provider.register();

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // Propagate W3C Trace Context to our backend
        propagateTraceHeaderCorsUrls: [
          /http:\/\/localhost:8000\/.*/,
          /http:\/\/192\.168\.68\.58:8000\/.*/,
          /http:\/\/127\.0\.0\.1:8000\/.*/,
        ],
      }),
    ],
  });
};
