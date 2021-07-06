# Installing

## CDN
To start monitoring with Splunk RUM distributed via CDN:
1. Include & initialize the Splunk RUM by copying the following to HEAD section for all the HTML files or templates in your application

    ```html
    <script src="https://cdn.signalfx.com/o11y-gdi-rum/latest/splunk-otel-web.js" crossorigin="anonymous"></script>
    <script>
      SplunkRum.init({
          beaconUrl: 'https://rum-ingest.<REALM>.signalfx.com/v1/rum',
          rumAuth: 'RUM access token',
          app: 'enter-your-application-name'
        });
    </script>
    ```

1. Modify the initialization parameters to specify:
   - `beaconUrl` - the destination URL to which captured telemetry is sent to be ingested. Replace the `<REALM>` with the actual realm you are using (i.e. us0, us1).
   - `rumAuth` - token authorizing the Agent to send the telemetry to the backend. You can find (or generate) the token [here](https://app.signalfx.com/o11y/#/organization/current?selectedKeyValue=sf_section:accesstokens).
     Notice that RUM and APM auth tokens are different.
   - `app` - naming the application that will be monitored so it can be distinguished from other applications.
1. Deploy the changes to your application and make sure that the application is being used.
1. Verify that the data is appearing in the RUM dashboard.

The method above is the recommendation to get started with Splunk RUM. This approach picks up the latest stable version of the Browser Agent distributed via CDN and loads the agent synchronously.

However if the synchronous auto-updating CDN distribution is not suitable to your needs, the following sections expose alternatives in depth.

## Self-hosted script
If you choose to self-host the Splunk RUM script you need to go through the following steps:

1. Download Splunk RUM asset(s) from the [Github repository](https://github.com/signalfx/splunk-otel-js-browser/releases/latest):
   - Splunk RUM [Agent](https://github.com/signalfx/splunk-otel-js-browser/releases/download/v0.4.2/splunk-otel-web.js)
   - Splunk RUM Agent [source map](https://github.com/signalfx/splunk-otel-js-browser/releases/download/v0.4.2/splunk-otel-web.js.map) (optional)
1. Host the assets in the domain of your choice, next to other JS assets, as a separate file. If served on a separate subdomain from webapp (e.g. static.example.com), make sure the server is configured to serve CORS headers.
1. Carry out the steps 1-4, similar to the previous section describing distribution over CDN.

## NPM

To start monitoring using Splunk RUM distributed via NPM:

1. Execute `npm install @splunk/otel-web --save` which installs the Splunk RUM NPM package and adds it to your application runtime dependencies in `package.json`
1. Create a file dedicated to initialising instrumentation named `splunk-instrumentation.js`, next to your bundle root file. Within this file include the following snippet:

    ```html
       import SplunkOtelWeb from '@splunk/otel-web';
       SplunkOtelWeb.init({
         beaconUrl: 'https://rum-ingest.<REALM>.signalfx.com/v1/rum',
         rumAuth: '<RUM access token>',
         app: '<application-name>',
       });
    ```

1. Modify the initialization parameters to specify:
   - `beaconUrl` - the destination URL to which captured telemetry is sent to be ingested. Replace the `<REALM>` with the actual realm you are using (i.e. us0, us1).
   - `rumAuth` - token authorizing the Agent to send the telemetry to the backend. You can find (or generate) the token [here](https://app.signalfx.com/o11y/#/organization/current?selectedKeyValue=sf_section:accesstokens).
     Notice that RUM and APM auth tokens are different.
   - `app` - naming the application that will be monitored so it can be distinguished from other applications.
1. Import or require the file above other application code files in your bundle root ensuring the instrumentation runs before the application code.

You can find an example NPM installation in our [Github examples](https://github.com/signalfx/splunk-otel-js-web/tree/cc69ea1e7c16a0ae2f9f144b7be8a139a708774d/examples/installing-npm).

Bear in mind that choosing this approach will require updating to new versions of Splunk RUM Agent by you, vs choosing the CDN which automatically receives version upgrades as they are rolled out by Splunk.

## Loading and initializing the Splunk RUM

Splunk RUM Agent needs to be loaded and initialized as early in the page as possible. Loading the Agent late results in blind spots in telemetry -  the Agent cannot capture data before it is initialized.

In order of preference, you have the following options to locate the loading and initialization of Splunk RUM. Going down the list, the chances of some resource loading timings, unhandled promise rejections or errors being missing from the telemetry data increases.

1. Synchronously loaded as the first resource in the `HEAD`. By doing so we can ensure the SDK is loaded first and collects all user interactions, resources and potential errors.
1. Bundled with other application scripts. In this case you should place Splunk Browser Agent at the top of the bundle and make sure the bundle is loaded synchronously.
1. Synchronously loaded as the first JS resource in the `HEAD`.
1. Asynchronously loaded: **this option is not supported**. Asynchronously loaded scripts initialize unpredictably, meaning the telemetry data would not be reliably captured, missing data that happened before loading finished (like javascript errors, ajax requests and some of the loaded resources) and missing interactivity information in future activity by the user.

You may choose to defer loading the Splunk Browser Agent. If you choose to defer the loading, you need to make sure other scripts on the page are also deferred, to guarantee the initialization order.

## Versioning the agent

Independent of whether you are using CDN, self-hosted or NPM based distribution, you need to be aware of the versioning policy of the Splunk RUM agent, especially in cases where you plan to take advantage of manual instrumentation directly using the OpenTelemetry APIs.

The versioning of the Splunk RUM Agent is based on [semantic versioning](https://semver.org). When you want more control over the version loaded, you have the following options based on the `MAJOR.MINOR.PATCH` versioning policy:

1. Use the `LATEST` (e.g. `latest`) version if you always want to stay upon the latest version of the Splunk RUM Agent.  Notice that if you rely upon manual instrumentation, this option is not suitable, as breaking API changes might occur between MAJOR version changes before the GA release of the OpenTelemetry JS API.
1. Use the `MAJOR` (e.g. `v0`) version if you want to receive new features automatically but stay backward compatible with the API. This is our default recommendation for all production deployments. This is the default for NPM installations.
1. Use the `MINOR` (e.g. `v0.1`) version, if you want to receive bug fixes, but no new features automatically.
1. Use the `PATCH` (e.g. `v0.1.2`) version when you want to guarantee that a specific version of Splunk RUM Agent is used to monitor your application.

The versions for the distribution are embedded in the URL as a designated token, for example the following

```https://cdn.signalfx.com/o11y-gdi-rum/v0.1/splunk-otel-web.js```

refers to the `MAJOR.MINOR` version of `0.1`, receiving bugfix patches such as `0.1.1` or `0.1.2` automatically, but would not automatically be upgraded if new functionality appears in `0.2` version.

## Linking with APM traces

In order to link the Splunk RUM information with the distributed traces in the APM, certain configuration changes need to be applied to the APM agents monitoring the backend of the application. The changes are required to enable sending the `server-timing` header from the back-end which is then used to stitch together the spans from the browser with the backend trace.

To enable this, you need to adjust the configuration in the service the browser connects to that is monitored by Splunk APM agents and set `SPLUNK_CONTEXT_SERVER_TIMING_ENABLED` or  environmental variable to `true` for all agents that do not automatically enable this. Currently only OpenTelemetry-based Java and Node.js agents ship with the configuration option enabled by default.  See manuals for corresponding APM agents for more information.

Trace linkage with APM is currently supported for following Splunk APM agents:

1. OpenTelemetry - based agents:
   - [splunk-otel-java](https://github.com/signalfx/splunk-otel-java)
   - [splunk-otel-python](https://github.com/signalfx/splunk-otel-python)
   - [splunk-otel-js](https://github.com/signalfx/splunk-otel-js)
   - [splunk-otel-go](https://github.com/signalfx/splunk-otel-go)
1. SignalFX agents:
   - [signalfx-java-tracing](https://github.com/signalfx/signalfx-java-tracing)
   - [signalfx-python-tracing](https://github.com/signalfx/signalfx-python-tracing)
   - [signalfx-dotnet-tracing](https://github.com/signalfx/signalfx-dotnet-tracing)
   - [signalfx-nodejs-tracing](https://github.com/signalfx/signalfx-nodejs-tracing)

If your configuration is unsupported, you can still stitch the APM trace with the RUM information by [enabling the trace linking manually](https://github.com/signalfx/splunk-otel-js-browser/blob/main/docs/ServerTraceContext.md).

## Hybrid inline / bottom-of-the-body mode

If you decide not to load the instrumentation synchronously in the HEAD due to its size, but you would like to track of errors happening during the page load, you can add a separate small inline error tracker, which you'll find [in the latest release](https://github.com/signalfx/splunk-otel-js-web/releases/latest).

This snippet should be placed in `<head>` above any other scripts in the document. **You still need to add the main script, either from CDN, or from NPM.**

The snippet's job is to capture errors which were raised before the main script loaded, and which would otherwise be missed. When the main script eventually loads, it disables the snippet, picks up the errors that were in it, and exports them to the backend. The benefit of using the hybrid mode is that you can load the main script later in the document, while you retain the ability to capture all errors.

## Miscellaneous

All your pages, assets, and requests must always be securely loaded over HTTPS protocol to avoid instrumentation failures.
If you have implemented CORS for any origins for your application to work, you need to set [`Timing-Allowed-Origin`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Timing-Allow-Origin) header next to existing CORS header.
