const mqtt = require("mqtt");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const util = require("util");
const http = require("http");
const { Server } = require("socket.io");

function deepLog(label, data) {
  console.log(
    label,
    util.inspect(data, {
      depth: null,
      colors: true,
      maxArrayLength: null,
      compact: false,
    })
  );
}

// ===== UI WebSocket Server =====
const httpServer = http.createServer((req, res) => {
  if (req.url === "/") {
    fs.createReadStream(path.join(__dirname, "index.html")).pipe(res);
  }
});
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

httpServer.listen(3001, () => {
  console.log("✓ UI WebSocket running on http://localhost:3001\n");
});

// MQTT Broker Configuration with TLS/SSL
const config = {
  host: "a1oc44fddprphm-ats.iot.us-west-2.amazonaws.com", // MQTT broker hostname or IP
  port: 8883, // Standard MQTT TLS port
  protocol: "mqtts", // Use 'mqtts' for secure connection
  clientId: `mqtt_logger_${Math.random().toString(16).slice(3)}`,
  topics: ["uatv2/restaurant/7096"], /// "uatv2/restaurant/6271" <----- ahmed tenant ["#"], // Subscribe to all topics
  // "uatv2/restaurant/7096"  Ahmed tenant
  //  "uatv2/restaurant/6271" zeejah tenant
  //  uatv2/restaurant/5182 usama tenant

  // TLS Certificate paths
  certificates: {
    ca: "./certs/aio_root_ca.crt", // Certificate Authority
    cert: "./certs/aio_private_cert.pem", // Client Certificate
    key: "./certs/aio_private_key.key", // Client Private Key
  },

  // Authentication (if needed in addition to certificates)
  //   username: "",
  //   password: "",

  // TLS Options
  rejectUnauthorized: true, // Set to false to accept self-signed certificates
};

// Read certificate files
let tlsOptions = {};

try {
  tlsOptions = {
    ca: fs.readFileSync(path.resolve(config.certificates.ca)),
    cert: fs.readFileSync(path.resolve(config.certificates.cert)),
    key: fs.readFileSync(path.resolve(config.certificates.key)),
    rejectUnauthorized: config.rejectUnauthorized,
  };
  console.log("✓ Certificates loaded successfully\n");
} catch (err) {
  console.error("✗ Error loading certificates:");
  console.error(err.message);
  console.error("\nPlease ensure certificate files exist at:");
  console.error(`  CA: ${config.certificates.ca}`);
  console.error(`  Cert: ${config.certificates.cert}`);
  console.error(`  Key: ${config.certificates.key}\n`);
  process.exit(1);
}

// Connect to MQTT broker with TLS
const client = mqtt.connect({
  host: config.host,
  port: config.port,
  protocol: config.protocol,
  clientId: config.clientId,
  clean: true,
  connectTimeout: 4000,
  username: config.username,
  password: config.password,
  reconnectPeriod: 1000,
  ...tlsOptions,
});

// Connection event
client.on("connect", () => {
  console.log("=================================");
  console.log("✓ Connected to MQTT Broker (TLS)");
  console.log("=================================");
  console.log(`Host: ${config.host}`);
  console.log(`Port: ${config.port}`);
  console.log(`Protocol: ${config.protocol}`);
  console.log(`Client ID: ${config.clientId}`);
  console.log(`TLS: Enabled`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=================================\n");

  // Subscribe to topics
  config.topics.forEach((topic) => {
    client.subscribe(topic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`✗ Failed to subscribe to ${topic}:`, err.message);
      } else {
        console.log(`✓ Subscribed to topic: ${topic}\n`);
      }
    });
  });
});

// Message received event
client.on("message", (topic, message) => {
  //   console.log(message);
  //   const rawMessage = message.toString("utf8");
  const isGzip =
    message.length >= 2 && message[0] === 0x1f && message[1] === 0x8b;

  let jsonString;

  if (isGzip) {
    // ✅ compressed
    jsonString = zlib.gunzipSync(message).toString("utf8");
  } else {
    // ✅ plain JSON
    jsonString = message.toString("utf8");
  }

  const data = JSON.parse(jsonString);
  //   console.log("Parsed data:", data);

  console.log("─────────────────────────────────");
  console.log(`📨 Message Received`);
  console.log(`Topic: ${topic}`);
  //   console.log(`Message: ${message.toString()}`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Size: ${message.length} bytes`);
  console.log("─────────────────────────────────\n");
  // deepLog("Parsed data:", data);
  // console.log("Stringfy data: ", jsonString);

  console.log("─────────────────────────────────\n");

  io.emit("mqtt-event", {
    id: Date.now(),
    topic,
    size: message.length,
    isCompressed: isGzip,
    time: new Date().toISOString(),
    raw: jsonString,
    parsed: data,
  });
});

// Error event
client.on("error", (err) => {
  console.error("=================================");
  console.error("✗ MQTT Error:");
  console.error("=================================");
  console.error(err);
  console.error("=================================\n");
});

// Reconnect event
client.on("reconnect", () => {
  console.log("⟳ Attempting to reconnect to MQTT broker...\n");
});

// Disconnect event
client.on("disconnect", () => {
  console.log("=================================");
  console.log("✗ Disconnected from MQTT Broker");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=================================\n");
});

// Offline event
client.on("offline", () => {
  console.log("⚠ Client is offline\n");
});

// Close event
client.on("close", () => {
  console.log("=================================");
  console.log("✗ Connection Closed");
  console.log(`Time: ${new Date().toISOString()}`);
  console.log("=================================\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n=================================");
  console.log("Shutting down MQTT client...");
  console.log("=================================\n");

  client.end(false, () => {
    console.log("✓ MQTT client disconnected gracefully");
    process.exit(0);
  });
});

console.log("Starting MQTT Event Logger with TLS...\n");
