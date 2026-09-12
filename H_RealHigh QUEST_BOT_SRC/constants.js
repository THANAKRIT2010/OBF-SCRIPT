"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Constants = void 0;
const node_crypto_1 = require("node:crypto");
class Constants extends null {
}
exports.Constants = Constants;
Constants.USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9188 Chrome/130.0.6723.137 Electron/33.2.1 Safari/537.36';
Constants.Properties = {
    os: 'Windows',
    browser: 'Discord Client',
    release_channel: 'stable',
    client_version: '1.0.9188',
    os_version: '10.0.22631',
    os_arch: 'x64',
    app_arch: 'x64',
    system_locale: 'en-US',
    has_client_mods: false,
    client_launch_id: (0, node_crypto_1.randomUUID)(),
    browser_user_agent: Constants.USER_AGENT,
    browser_version: '130.0.6723.137',
    os_sdk_version: '22631',
    client_build_number: 531337,
    native_build_number: null,
    client_event_source: null,
    launch_signature: (0, node_crypto_1.randomUUID)(),
    client_heartbeat_session_id: (0, node_crypto_1.randomUUID)(),
    client_app_state: 'focused',
    design_id: 0,
};
