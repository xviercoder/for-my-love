from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
import socket

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

def local_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()

server = None
port = None

for candidate in range(5500, 5511):
    try:
        server = ThreadingHTTPServer(("0.0.0.0", candidate), SimpleHTTPRequestHandler)
        port = candidate
        break
    except OSError:
        continue

if server is None:
    raise RuntimeError("Port 5500-5510 sedang digunakan.")

ip = local_ip()

print("")
print("Carine Sakura Love is running.")
print(f"PC / VS Code preview : http://localhost:{port}")
print(f"iPhone same Wi-Fi    : http://{ip}:{port}")
print("")
print("Jika Windows Firewall muncul, izinkan untuk Private networks.")
print("Press Ctrl+C to stop.")
print("")

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("\nServer stopped.")
finally:
    server.server_close()
