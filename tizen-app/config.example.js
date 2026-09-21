// Configuration for the TV weather app.
//
// SETUP:
//   1. Copy this file to config.js
//   2. Fill in the values below
//   3. config.js is gitignored and is NOT committed
//
// The app reads the weather station from the local hub on the NAS. It makes no
// SmartThings API call — that API becomes a paid subscription in October 2026,
// and this app was one of the three things depending on it.

window.APP_CONFIG = {
  hub: {
    // Where the weather service lives. Use an address, not a hostname: the TV
    // resolves names through the router, and a NAS with a static address never
    // registers one.
    //
    // NOTE: this address ALSO appears in config.xml, in the
    // content-security-policy connect-src list. Change it in both places or
    // the fetch is blocked by the policy rather than failing on the network,
    // which looks nothing like an address problem in the logs.
    baseUrl: "http://192.168.18.250:5000",

    // The READ_TOKEN from the hub's .env.
    //
    // This ships inside the .wgt installed on the television, so treat it as
    // published: anyone with the package or access to the TV can read it. That
    // is exactly why the hub uses three separate tokens — this one can read
    // weather and nothing else. Never put INGEST_TOKEN or ACTION_TOKEN here.
    readToken: "PASTE_YOUR_READ_TOKEN_HERE",

    // How often to poll, in seconds. The station posts roughly every 370s, so
    // anything below about a minute just re-reads the same row.
    refreshSeconds: 60
  }
};
