from __future__ import annotations

import configparser
import json
import logging
import os
import re
import signal
import threading
import time
from dataclasses import dataclass
from pathlib import Path

import paho.mqtt.client as mqtt
from websockets.sync.server import serve


APP_NAME = "HA Video Call Bridge"
APP_VERSION = "1.1.0"

MEET_BRIDGE_HOST = "127.0.0.1"
MEET_BRIDGE_PORT = 2395

ZOOM_STATUS_PATTERN = re.compile(r"HandleSyncMeetingStatusData\s+eStatus\s*:(\d+)")


@dataclass
class Config:
    mqtt_host: str
    mqtt_port: int
    mqtt_username: str
    mqtt_password: str

    mqtt_topic_meet: str
    mqtt_topic_zoom: str
    mqtt_topic_active: str
    mqtt_topic_status: str

    mqtt_discovery_prefix: str

    zoom_log_directory: Path
    zoom_log_pattern: str

    poll_interval: float


class VideoCallBridge:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.running = True

        self.meet_active = False
        self.zoom_active = False

        self.last_published_meet: bool | None = None
        self.last_published_zoom: bool | None = None
        self.last_published_active: bool | None = None

        self.zoom_log_path: Path | None = None
        self.zoom_log_position = 0

        self.mqtt_connected = False

        # /*
        #  * Each meet.google.com tab gets its own client ID.
        #  *
        #  * This matters if more than one Meet tab is open. Meet is active
        #  * if ANY connected tab reports an active meeting.
        #  */
        self.meet_clients: dict[str, bool] = {}
        self.meet_clients_lock = threading.Lock()

        self.mqtt_client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id="ha-video-call-bridge",
            clean_session=True,
        )

        if self.config.mqtt_username:
            self.mqtt_client.username_pw_set(
                self.config.mqtt_username,
                self.config.mqtt_password,
            )

        self.mqtt_client.will_set(
            self.config.mqtt_topic_status,
            payload="offline",
            qos=1,
            retain=True,
        )

        self.mqtt_client.on_connect = self._on_mqtt_connect
        self.mqtt_client.on_disconnect = self._on_mqtt_disconnect

    # ------------------------------------------------------------------
    # MQTT
    # ------------------------------------------------------------------

    def _on_mqtt_connect(
        self,
        client: mqtt.Client,
        userdata,
        flags,
        reason_code,
        properties,
    ) -> None:
        if reason_code == 0:
            logging.info("Connected to MQTT broker.")
            self.mqtt_connected = True

            client.publish(
                self.config.mqtt_topic_status,
                "online",
                qos=1,
                retain=True,
            )

            self.publish_discovery()

            self.last_published_meet = None
            self.last_published_zoom = None
            self.last_published_active = None
        else:
            logging.error(
                "MQTT connection failed with reason code: %s",
                reason_code,
            )

    def _on_mqtt_disconnect(
        self,
        client: mqtt.Client,
        userdata,
        disconnect_flags,
        reason_code,
        properties,
    ) -> None:
        self.mqtt_connected = False

        if self.running:
            logging.warning(
                "Disconnected from MQTT broker. Reason: %s",
                reason_code,
            )

    def connect_mqtt(self) -> None:
        logging.info(
            "Connecting to MQTT broker %s:%s...",
            self.config.mqtt_host,
            self.config.mqtt_port,
        )

        self.mqtt_client.connect_async(
            self.config.mqtt_host,
            self.config.mqtt_port,
            keepalive=60,
        )

        self.mqtt_client.loop_start()

    def publish_discovery(self) -> None:
        device = {
            "identifiers": ["ha_video_call_bridge"],
            "name": "Video Call Bridge",
            "manufacturer": "Custom",
            "model": "Windows Video Call Bridge",
            "sw_version": APP_VERSION,
        }

        entities = [
            {
                "object_id": "video_call_meet",
                "name": "Google Meet",
                "state_topic": self.config.mqtt_topic_meet,
                "unique_id": "ha_video_call_bridge_meet",
            },
            {
                "object_id": "video_call_zoom",
                "name": "Zoom",
                "state_topic": self.config.mqtt_topic_zoom,
                "unique_id": "ha_video_call_bridge_zoom",
            },
            {
                "object_id": "video_call_active",
                "name": "Video Call",
                "state_topic": self.config.mqtt_topic_active,
                "unique_id": "ha_video_call_bridge_active",
            },
        ]

        for entity in entities:
            topic = (
                f"{self.config.mqtt_discovery_prefix}/binary_sensor/"
                f"{entity['object_id']}/config"
            )

            payload = {
                "name": entity["name"],
                "state_topic": entity["state_topic"],
                "availability_topic": self.config.mqtt_topic_status,
                "payload_on": "ON",
                "payload_off": "OFF",
                "payload_available": "online",
                "payload_not_available": "offline",
                "device_class": "running",
                "unique_id": entity["unique_id"],
                "device": device,
            }

            self.mqtt_client.publish(
                topic,
                json.dumps(payload),
                qos=1,
                retain=True,
            )

        logging.info("Published Home Assistant MQTT Discovery configuration.")

    def publish_states(self) -> None:
        if not self.mqtt_connected:
            return

        active = self.meet_active or self.zoom_active

        if self.meet_active != self.last_published_meet:
            self._publish_boolean(
                self.config.mqtt_topic_meet,
                self.meet_active,
            )
            self.last_published_meet = self.meet_active

        if self.zoom_active != self.last_published_zoom:
            self._publish_boolean(
                self.config.mqtt_topic_zoom,
                self.zoom_active,
            )
            self.last_published_zoom = self.zoom_active

        if active != self.last_published_active:
            self._publish_boolean(
                self.config.mqtt_topic_active,
                active,
            )
            self.last_published_active = active

    def _publish_boolean(self, topic: str, value: bool) -> None:
        payload = "ON" if value else "OFF"

        self.mqtt_client.publish(
            topic,
            payload,
            qos=1,
            retain=True,
        )

        logging.info("MQTT %s = %s", topic, payload)

    # ------------------------------------------------------------------
    # Google Meet
    # ------------------------------------------------------------------

    def start_meet_server(self) -> None:
        thread = threading.Thread(
            target=self._run_meet_server,
            name="MeetWebSocketServer",
            daemon=True,
        )

        thread.start()

    def _run_meet_server(self) -> None:
        logging.info(
            "Google Meet WebSocket server listening on ws://%s:%s",
            MEET_BRIDGE_HOST,
            MEET_BRIDGE_PORT,
        )

        try:
            with serve(
                self._handle_meet_connection,
                MEET_BRIDGE_HOST,
                MEET_BRIDGE_PORT,
            ) as server:
                server.serve_forever()

        except Exception:
            logging.exception("Google Meet WebSocket server stopped unexpectedly.")
            self.running = False

    def _handle_meet_connection(self, websocket) -> None:
        connection_client_ids: set[str] = set()

        try:
            for raw_message in websocket:
                try:
                    message = json.loads(raw_message)
                except json.JSONDecodeError:
                    logging.warning("Ignoring invalid Google Meet bridge message.")
                    continue

                if message.get("type") != "meet_state":
                    continue

                client_id = str(message.get("client_id", "")).strip()
                active = message.get("active")

                if not client_id or not isinstance(active, bool):
                    logging.warning("Ignoring malformed Google Meet state message.")
                    continue

                connection_client_ids.add(client_id)

                with self.meet_clients_lock:
                    previous_client_state = self.meet_clients.get(client_id)

                    self.meet_clients[client_id] = active

                    previous_meet_state = self.meet_active
                    self.meet_active = any(self.meet_clients.values())

                if previous_client_state != active:
                    logging.info(
                        "Google Meet tab %s: %s",
                        client_id[:8],
                        "ACTIVE" if active else "INACTIVE",
                    )

                if self.meet_active != previous_meet_state:
                    logging.info(
                        "Google Meet state changed: %s",
                        "ACTIVE" if self.meet_active else "INACTIVE",
                    )

        except Exception as exc:
            logging.debug(
                "Google Meet browser connection closed: %s",
                exc,
            )

        finally:
            if connection_client_ids:
                with self.meet_clients_lock:
                    previous_meet_state = self.meet_active

                    for client_id in connection_client_ids:
                        self.meet_clients.pop(client_id, None)

                    self.meet_active = any(self.meet_clients.values())

                if self.meet_active != previous_meet_state:
                    logging.info(
                        "Google Meet state changed: %s",
                        "ACTIVE" if self.meet_active else "INACTIVE",
                    )

    # ------------------------------------------------------------------
    # Zoom
    # ------------------------------------------------------------------

    def find_latest_zoom_log(self) -> Path | None:
        directory = self.config.zoom_log_directory

        if not directory.exists():
            return None

        files = [
            path
            for path in directory.glob(self.config.zoom_log_pattern)
            if path.is_file()
        ]

        if not files:
            return None

        return max(
            files,
            key=lambda path: path.stat().st_mtime,
        )

    def switch_zoom_log_if_needed(self) -> None:
        latest = self.find_latest_zoom_log()

        if latest is None:
            if self.zoom_log_path is not None:
                logging.warning("No Zoom IPCSDK log files found.")

            self.zoom_log_path = None
            self.zoom_log_position = 0
            self.zoom_active = False
            return

        if latest != self.zoom_log_path:
            self.zoom_log_path = latest

            logging.info(
                "Using Zoom IPCSDK log: %s",
                latest.name,
            )

            # /*
            #  * Read the existing log from the beginning so we can
            #  * recover Zoom's current state when the bridge starts.
            #  */
            self.zoom_log_position = 0
            self.read_zoom_log_updates()

    def read_zoom_log_updates(self) -> None:
        if self.zoom_log_path is None:
            return

        try:
            file_size = self.zoom_log_path.stat().st_size

            if file_size < self.zoom_log_position:
                logging.info("Zoom log was truncated. Reading from start.")
                self.zoom_log_position = 0

            with self.zoom_log_path.open(
                "r",
                encoding="utf-8",
                errors="ignore",
            ) as log_file:
                log_file.seek(self.zoom_log_position)

                for line in log_file:
                    match = ZOOM_STATUS_PATTERN.search(line)

                    if not match:
                        continue

                    status = int(match.group(1))
                    self.handle_zoom_status(status)

                self.zoom_log_position = log_file.tell()

        except (OSError, PermissionError) as exc:
            logging.warning(
                "Unable to read Zoom log %s: %s",
                self.zoom_log_path,
                exc,
            )

    def handle_zoom_status(self, status: int) -> None:
        """
        Zoom IPCSDK states verified during live testing:

            1 = connecting / inactive
            3 = active meeting
            4 = leaving
            7 = inactive / meeting ended
        """

        previous = self.zoom_active

        if status == 3:
            self.zoom_active = True

        elif status in (1, 4, 7):
            self.zoom_active = False

        else:
            logging.debug(
                "Ignoring unrecognized Zoom meeting status: %s",
                status,
            )
            return

        if self.zoom_active != previous:
            logging.info(
                "Zoom meeting state changed: %s (status %s)",
                "ACTIVE" if self.zoom_active else "INACTIVE",
                status,
            )

    def update_zoom(self) -> None:
        self.switch_zoom_log_if_needed()
        self.read_zoom_log_updates()

    # ------------------------------------------------------------------
    # Main loop
    # ------------------------------------------------------------------

    def run(self) -> None:
        logging.info(
            "%s v%s starting.",
            APP_NAME,
            APP_VERSION,
        )

        logging.info(
            "Zoom log directory: %s",
            self.config.zoom_log_directory,
        )

        self.start_meet_server()
        self.connect_mqtt()

        while self.running:
            try:
                self.update_zoom()
                self.publish_states()

            except Exception:
                logging.exception(
                    "Unexpected error in bridge loop. The bridge will continue running."
                )

            time.sleep(self.config.poll_interval)

        self.shutdown()

    def stop(self, *_args) -> None:
        logging.info("Shutdown requested.")
        self.running = False

    def shutdown(self) -> None:
        logging.info("Stopping %s...", APP_NAME)

        try:
            if self.mqtt_connected:
                self.mqtt_client.publish(
                    self.config.mqtt_topic_status,
                    "offline",
                    qos=1,
                    retain=True,
                )

                time.sleep(0.25)

            self.mqtt_client.disconnect()
            self.mqtt_client.loop_stop()

        except Exception:
            logging.exception("Error while shutting down MQTT.")

        logging.info("%s stopped.", APP_NAME)


def get_application_directory() -> Path:
    return Path(__file__).resolve().parent.parent


def expand_windows_path(value: str) -> Path:
    return Path(os.path.expandvars(os.path.expanduser(value)))


def load_config(path: Path) -> Config:
    if not path.exists():
        raise FileNotFoundError(
            f"Configuration file not found: {path}\n"
            "Copy config.example.ini to config.ini and edit it."
        )

    # /*
    #  * Disable ConfigParser's percent interpolation because Windows
    #  * environment variables use syntax such as %APPDATA%.
    #  */
    parser = configparser.ConfigParser(interpolation=None)

    parser.read(
        path,
        encoding="utf-8",
    )

    return Config(
        mqtt_host=parser.get(
            "mqtt",
            "host",
        ),
        mqtt_port=parser.getint(
            "mqtt",
            "port",
            fallback=1883,
        ),
        mqtt_username=parser.get(
            "mqtt",
            "username",
            fallback="",
        ),
        mqtt_password=parser.get(
            "mqtt",
            "password",
            fallback="",
        ),
        mqtt_topic_meet=parser.get(
            "mqtt",
            "topic_meet",
            fallback="office/video_call/meet",
        ),
        mqtt_topic_zoom=parser.get(
            "mqtt",
            "topic_zoom",
            fallback="office/video_call/zoom",
        ),
        mqtt_topic_active=parser.get(
            "mqtt",
            "topic_active",
            fallback="office/video_call/active",
        ),
        mqtt_topic_status=parser.get(
            "mqtt",
            "topic_status",
            fallback="office/video_call/status",
        ),
        mqtt_discovery_prefix=parser.get(
            "home_assistant",
            "discovery_prefix",
            fallback="homeassistant",
        ),
        zoom_log_directory=expand_windows_path(
            parser.get(
                "zoom",
                "log_directory",
                fallback=r"%APPDATA%\IPCSDK\logs",
            )
        ),
        zoom_log_pattern=parser.get(
            "zoom",
            "log_pattern",
            fallback="ToolSuite_*.log",
        ),
        poll_interval=parser.getfloat(
            "bridge",
            "poll_interval",
            fallback=1.0,
        ),
    )


def configure_logging(log_path: Path) -> None:
    handlers = [
        logging.StreamHandler(),
        logging.FileHandler(
            log_path,
            encoding="utf-8",
        ),
    ]

    logging.basicConfig(
        level=logging.INFO,
        format=("%(asctime)s | %(levelname)-8s | %(message)s"),
        datefmt="%Y-%m-%d %H:%M:%S",
        handlers=handlers,
    )


def main() -> int:
    app_directory = get_application_directory()

    config_path = app_directory / "config.ini"
    log_path = app_directory / "bridge.log"

    configure_logging(log_path)

    try:
        config = load_config(config_path)

    except Exception as exc:
        logging.error("%s", exc)
        return 1

    bridge = VideoCallBridge(config)

    signal.signal(
        signal.SIGINT,
        bridge.stop,
    )

    if hasattr(signal, "SIGTERM"):
        signal.signal(
            signal.SIGTERM,
            bridge.stop,
        )

    try:
        bridge.run()

    except KeyboardInterrupt:
        bridge.stop()
        bridge.shutdown()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
