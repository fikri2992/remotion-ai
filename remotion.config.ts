// See all configuration options: https://remotion.dev/docs/config
// Each option also is available as a CLI flag: https://remotion.dev/docs/cli

// Note: When using the Node.JS APIs, the config file doesn't apply. Instead, pass options directly to the APIs

import { Config } from "@remotion/cli/config";

Config.setOverwriteOutput(true);
// Improve color consistency and quality
Config.setColorSpace('bt709');
// Prefer lossless frame images to avoid color shifts from JPEG compression
Config.setVideoImageFormat('png');
// If JPEG is ever used, ensure high quality
Config.setJpegQuality(100);
// Use a higher quality H.264 output (lower CRF = higher quality)
Config.setCrf(18);
// Better quality at similar bitrate, slower encode
Config.setX264Preset('slow');
// Keep maximum compatibility
Config.setPixelFormat('yuv420p');
