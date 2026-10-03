import json
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


LISTEN_ADDRESS = "0.0.0.0"
LISTEN_PORT = 8766

GOXLR_URL = "http://127.0.0.1:14564/api/command"
GOXLR_SERIAL = "S210710931CQK"


def set_fader_state(fader, state):
    payload = {"Command": [GOXLR_SERIAL, {"SetFaderMuteState": [fader, state]}]}

    data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        GOXLR_URL,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=5) as response:
        return response.read().decode("utf-8")


def mute_all():
    for fader in ("A", "B", "C", "D"):
        set_fader_state(fader, "MutedToX")


def unmute():
    # Mic remains muted.
    set_fader_state("A", "MutedToX")

    for fader in ("B", "C", "D"):
        set_fader_state(fader, "Unmuted")


class GoXLRHandler(BaseHTTPRequestHandler):
    def send_text(self, status, message):
        body = message.encode("utf-8")

        self.send_response(status)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()

        self.wfile.write(body)

    def do_GET(self):
        try:
            if self.path == "/mute":
                mute_all()
                self.send_text(200, "GoXLR faders muted")

            elif self.path == "/unmute":
                unmute()
                self.send_text(200, "GoXLR faders unmuted; Mic remains muted")

            elif self.path == "/status":
                self.send_text(200, "GoXLR Bridge is running")

            else:
                self.send_text(404, "Not found")

        except Exception as error:
            self.send_text(500, f"Error: {error}")

    def log_message(self, format, *args):
        print(f"{self.client_address[0]} - {format % args}")


if __name__ == "__main__":
    server = ThreadingHTTPServer((LISTEN_ADDRESS, LISTEN_PORT), GoXLRHandler)

    print("GoXLR Bridge")
    print("==============================")
    print(f"Listening on port {LISTEN_PORT}")
    print()
    print("Available commands:")
    print(f"  http://127.0.0.1:{LISTEN_PORT}/status")
    print(f"  http://127.0.0.1:{LISTEN_PORT}/mute")
    print(f"  http://127.0.0.1:{LISTEN_PORT}/unmute")
    print()

    server.serve_forever()
