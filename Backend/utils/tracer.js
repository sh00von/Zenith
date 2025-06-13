// utils/tracer.js
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace } from '@opentelemetry/api';

const sdk = new NodeSDK({
  // optionally configure a traceExporter here
  // traceExporter: /* e.g. new ConsoleSpanExporter() */
});
sdk.start();

// obtain a named tracer for your app
export const tracer = trace.getTracer('rag-assistant');
