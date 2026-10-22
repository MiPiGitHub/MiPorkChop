"""Network-only tests; no Raspberry Pi required."""
import importlib.util
import json
import sys
import types
import unittest
from unittest.mock import patch

# gpiozero import is mocked: test only the HTTP adapter on desktop CI.
gpiozero = types.ModuleType("gpiozero")
gpiozero.Button = object
gpiozero.LED = object
sys.modules.setdefault("gpiozero", gpiozero)
spec = importlib.util.spec_from_file_location("porkchop", "src/porkchop.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class FakeResponse:
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def read(self): return b'{"ok":true,"state":"CLOSED"}'

class TestWorkerClient(unittest.TestCase):
    def test_post_payload_and_auth(self):
        with patch.object(module.urllib.request, "urlopen", return_value=FakeResponse()) as send:
            module.post_status("https://example.workers.dev/", "test-token", "CLOSED")
            request = send.call_args.args[0]
            self.assertEqual(request.full_url, "https://example.workers.dev/api/status")
            self.assertEqual(request.get_method(), "POST")
            self.assertEqual(json.loads(request.data), {"state":"CLOSED"})
            self.assertEqual(request.get_header("Authorization"), "Bearer test-token")

if __name__ == "__main__":
    unittest.main()
